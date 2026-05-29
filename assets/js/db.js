// Data layer — Supabase-backed with in-memory cache.
//
// OFFLINE-FIRST (quando idb.js está carregado e IndexedDB existe):
//  - init(): carrega snapshot local (IndexedDB) primeiro → app abre sem rede;
//    depois tenta sincronizar a fila e baixar dados frescos do Supabase.
//  - Leituras: síncronas, do cache em memória.
//  - Escritas: atualizam o cache, persistem o snapshot, ENFILEIRAM a operação
//    (outbox) e tentam enviar. Sem rede, ficam na fila e sobem ao reconectar
//    (evento 'online', retry periódico e no próximo init).
//
// SEM IndexedDB (ex.: páginas que não carregam idb.js): comportamento online
// clássico — escrita "fire-and-forget", init só busca do Supabase.
const DB = (() => {
  const SUPABASE_URL = window.SUPABASE_URL  || '';
  const SUPABASE_KEY = window.SUPABASE_ANON_KEY || '';
  const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const _offline = (typeof IDB !== 'undefined') && (typeof indexedDB !== 'undefined');

  let _cache = { users: [], obras: [], rdos: [], rdo_linhas: [], obra_usuarios: [], obra_anexos: [] };

  // ── Estado de sincronização ───────────────────────
  let _online   = (typeof navigator !== 'undefined') ? navigator.onLine : true;
  let _pending  = 0;
  let _syncing  = false;
  let _pTimer   = null;
  let _retry    = null;
  const _subs   = new Set();

  function getSyncState() { return { offlineEnabled: _offline, online: _online, pending: _pending, syncing: _syncing }; }
  function _emit() { const s = getSyncState(); _subs.forEach(fn => { try { fn(s); } catch (e) {} }); }
  function onSyncChange(fn) { _subs.add(fn); try { fn(getSyncState()); } catch (e) {} return () => _subs.delete(fn); }
  function isOnline() { return _online; }
  function getPendingCount() { return _pending; }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Fire-and-forget (modo online clássico)
  function _bg(promise) { promise.then(({ error }) => { if (error) console.error('[DB write]', error); }); }

  // Persiste o snapshot do cache (debounce) — só no modo offline
  function _persist() {
    if (!_offline) return;
    clearTimeout(_pTimer);
    _pTimer = setTimeout(() => { IDB.set('kv', 'cache', _cache).catch(e => console.error('[snapshot]', e)); }, 250);
  }

  // Executa uma operação no Supabase (thenable {data,error})
  function _apply(op) {
    const q = _sb.from(op.table);
    switch (op.type) {
      case 'insert': return q.insert(op.payload);
      case 'update': return q.update(op.payload).eq(op.match.col, op.match.val);
      case 'upsert': return q.upsert(op.payload, op.match && op.match.opts);
      case 'delete': return q.delete().eq(op.match.col, op.match.val);
    }
    return Promise.resolve({ error: null });
  }

  // Registra uma escrita: enfileira (offline) ou dispara direto (online clássico)
  function _queue(table, type, payload, match) {
    if (_offline) {
      IDB.add('outbox', { table, type, payload, match, ts: Date.now() })
        .then(() => IDB.count('outbox'))
        .then(n => { _pending = n; _emit(); sync(); })
        .catch(e => { console.error('[outbox]', e); _bg(_apply({ table, type, payload, match })); }); // IndexedDB indisponível → tenta direto
    } else {
      _bg(_apply({ table, type, payload, match }));
    }
  }

  // Drena a fila para o Supabase, em ordem. Retorna true se esvaziou (online).
  async function sync() {
    if (!_offline || _syncing) return _pending === 0;
    _syncing = true; _emit();
    let drained = true;
    try {
      const items = await IDB.all('outbox'); // ordenados por _key (ordem de inserção)
      for (const item of items) {
        try {
          const res = await _apply(item);
          if (res && res.error) console.error('[sync] erro do servidor, descartando item:', item.table, res.error);
          await IDB.del('outbox', item._key); // sucesso OU erro de servidor → remove (evita travar a fila)
        } catch (netErr) {
          drained = false; _online = false; break; // falha de rede → mantém item e para
        }
      }
      _pending = await IDB.count('outbox');
      if (drained) _online = true;
    } catch (e) {
      drained = false;
    } finally {
      _syncing = false; _emit();
      // Pega itens enfileirados durante esta sincronização
      if (_online && _pending > 0) setTimeout(() => sync(), 400);
    }
    return drained && _pending === 0;
  }

  async function _fetchAll() {
    const [u, o, r, rl, ou, oa] = await Promise.all([
      _sb.from('usuarios').select('*'),
      _sb.from('obras').select('*'),
      _sb.from('rdos').select('*'),
      _sb.from('rdo_linhas').select('*'),
      _sb.from('obra_usuarios').select('*'),
      _sb.from('obra_anexos').select('*')
    ]);
    const errd = [u, o, r, rl, ou, oa].find(x => x && x.error);
    if (errd) throw errd.error; // não sobrescreve o cache com vazio em caso de erro
    return {
      users:         u.data  || [],
      obras:         o.data  || [],
      rdos:          r.data  || [],
      rdo_linhas:    rl.data || [],
      obra_usuarios: ou.data || [],
      obra_anexos:   oa.data || []
    };
  }

  async function _ensureAdmin() {
    if (_cache.users.find(u => u.email === 'admin@modular.com')) return;
    const admin = {
      id: uuid(), nome_completo: 'Administrador', email: 'admin@modular.com',
      senha_hash: btoa('admin123'), perfil: 'ADMIN', funcao_principal: 'Encarregado', ativo: true
    };
    const { error } = await _sb.from('usuarios').insert(admin);
    if (!error) { _cache.users.push(admin); _persist(); }
  }

  async function init() {
    if (_offline) {
      try { const snap = await IDB.get('kv', 'cache'); if (snap) _cache = snap; } catch (e) {}
      try { _pending = await IDB.count('outbox'); } catch (e) {}
      _emit();
      window.addEventListener('online',  () => { _online = true;  _emit(); sync(); });
      window.addEventListener('offline', () => { _online = false; _emit(); });
      if (!_retry) _retry = setInterval(() => { if (_pending > 0) sync(); }, 30000);
    }
    try {
      if (_offline && _pending > 0) await sync();        // sobe pendências primeiro
      const fresh = await _fetchAll();                   // lança se offline
      _cache = fresh;
      _online = true;
      if (_offline) await IDB.set('kv', 'cache', _cache).catch(() => {});
      await _ensureAdmin();
    } catch (e) {
      _online = false; // offline: segue com o snapshot local
    }
    _emit();
  }

  // ── USERS ──────────────────────────────────────────
  function getUsers()            { return _cache.users; }
  function getUserByEmail(email) { return _cache.users.find(u => u.email.toLowerCase() === email.toLowerCase()); }
  function getUserById(id)       { return _cache.users.find(u => u.id === id); }

  function createUser(data) {
    const user = { id: uuid(), ativo: true, ...data };
    _cache.users.push(user); _persist();
    _queue('usuarios', 'insert', user);
    return user;
  }
  function updateUser(id, data) {
    _cache.users = _cache.users.map(u => u.id === id ? { ...u, ...data } : u); _persist();
    _queue('usuarios', 'update', data, { col: 'id', val: id });
  }
  function deleteUser(id) {
    _cache.users = _cache.users.filter(u => u.id !== id); _persist();
    _queue('usuarios', 'delete', null, { col: 'id', val: id });
  }

  // ── OBRAS ──────────────────────────────────────────
  function getObras()       { return _cache.obras; }
  function getObrasAtivas() { return _cache.obras.filter(o => o.status_obra === 'Ativa'); }
  function getObraById(id)  { return _cache.obras.find(o => o.id_obra === id); }

  function createObra(data) {
    const obra = { id_obra: uuid(), data_cadastro: new Date().toISOString(), codigo_cliente: generateCodigoCliente(), ...data };
    _cache.obras.push(obra); _persist();
    _queue('obras', 'insert', obra);
    return obra;
  }
  function updateObra(id, data) {
    _cache.obras = _cache.obras.map(o => o.id_obra === id ? { ...o, ...data } : o); _persist();
    _queue('obras', 'update', data, { col: 'id_obra', val: id });
  }
  function deleteObra(id) {
    _cache.obras = _cache.obras.filter(o => o.id_obra !== id); _persist();
    _queue('obras', 'delete', null, { col: 'id_obra', val: id });
  }

  // ── RDOs ──────────────────────────────────────────
  function getRDOs()         { return _cache.rdos; }
  function getRDOById(id)    { return _cache.rdos.find(r => r.id_rdo === id); }
  function getRDOsByData(d)  { return _cache.rdos.filter(r => r.data_apontamento === d); }
  function getRDOByObraAndData(id_obra, d) {
    return _cache.rdos.find(r => r.id_obra === id_obra && r.data_apontamento === d);
  }
  function getRDOByObraDataUsuario(id_obra, d, id_usuario) {
    return _cache.rdos.find(r => r.id_obra === id_obra && r.data_apontamento === d && r.id_usuario_criador === id_usuario);
  }
  function getRDOsByObraData(id_obra, d) {
    return _cache.rdos.filter(r => r.id_obra === id_obra && r.data_apontamento === d);
  }

  function createRDO(data) {
    const rdo = { id_rdo: uuid(), ...data };
    _cache.rdos.push(rdo); _persist();
    _queue('rdos', 'insert', rdo);
    return rdo;
  }
  function updateRDO(id, data) {
    const payload = { ...data, updated_at: new Date().toISOString() };
    _cache.rdos = _cache.rdos.map(r => r.id_rdo === id ? { ...r, ...data } : r); _persist();
    _queue('rdos', 'update', payload, { col: 'id_rdo', val: id });
  }

  // ── RDO LINHAS ────────────────────────────────────
  function getRDOLinhas(id_rdo) { return _cache.rdo_linhas.filter(l => l.id_rdo === id_rdo); }
  function getLinha(id_rdo, horario) {
    return _cache.rdo_linhas.find(l => l.id_rdo === id_rdo && l.horario_ponto === horario);
  }
  function upsertLinha(data) {
    const idx = _cache.rdo_linhas.findIndex(l => l.id_rdo === data.id_rdo && l.horario_ponto === data.horario_ponto);
    let linha;
    if (idx >= 0) {
      linha = { ..._cache.rdo_linhas[idx], ...data };
      _cache.rdo_linhas[idx] = linha;
    } else {
      linha = { id_linha: uuid(), ...data };
      _cache.rdo_linhas.push(linha);
    }
    _persist();
    _queue('rdo_linhas', 'upsert', linha, { opts: { onConflict: 'id_rdo,horario_ponto' } });
  }

  // ── OBRA USUARIOS ─────────────────────────────────
  function getObraUsuarios(id_obra)  { return _cache.obra_usuarios.filter(x => x.id_obra === id_obra); }
  function getUserIdsByObra(id_obra) { return getObraUsuarios(id_obra).map(x => x.id_usuario); }
  function getObrasByUsuario(id_usuario) {
    const ids = _cache.obra_usuarios.filter(x => x.id_usuario === id_usuario).map(x => x.id_obra);
    return ids.map(id => getObraById(id)).filter(Boolean).filter(o => o.status_obra === 'Ativa');
  }
  function setObraUsuarios(id_obra, user_ids) {
    _cache.obra_usuarios = _cache.obra_usuarios.filter(x => x.id_obra !== id_obra);
    user_ids.forEach(id_usuario => _cache.obra_usuarios.push({ id_obra, id_usuario }));
    _persist();
    if (_offline) {
      // Offline: outbox processa delete→insert em ordem (chaves sequenciais)
      _queue('obra_usuarios', 'delete', null, { col: 'id_obra', val: id_obra });
      if (user_ids.length > 0) {
        _queue('obra_usuarios', 'insert', user_ids.map(id_usuario => ({ id_obra, id_usuario })));
      }
    } else {
      // Online clássico: delete e DEPOIS insert (sequencial, sem corrida)
      (async () => {
        await _sb.from('obra_usuarios').delete().eq('id_obra', id_obra);
        if (user_ids.length > 0) {
          const { error } = await _sb.from('obra_usuarios').insert(user_ids.map(id_usuario => ({ id_obra, id_usuario })));
          if (error) console.error('[DB] setObraUsuarios:', error);
        }
      })();
    }
  }
  function isUserInObra(id_obra, id_usuario) { return getUserIdsByObra(id_obra).includes(id_usuario); }

  // ── OBRA ANEXOS (Storage — requer internet) ───────
  function getAnexosByObra(obra_id) {
    return _cache.obra_anexos.filter(a => a.obra_id === obra_id);
  }
  async function addAnexo(obra_id, nome, file) {
    const ext  = file.name.split('.').pop();
    const path = `${obra_id}/${uuid()}.${ext}`;
    const { error: upErr } = await _sb.storage.from('obra-anexos').upload(path, file);
    if (upErr) throw upErr;
    const { data: urlData } = _sb.storage.from('obra-anexos').getPublicUrl(path);
    const anexo = {
      id: uuid(), obra_id, nome,
      arquivo_url: urlData.publicUrl,
      arquivo_path: path,
      arquivo_nome: file.name,
      criado_em: new Date().toISOString()
    };
    const { error: insErr } = await _sb.from('obra_anexos').insert(anexo);
    if (insErr) throw insErr;
    _cache.obra_anexos.push(anexo); _persist();
    return anexo;
  }
  async function deleteAnexo(id, arquivo_path) {
    await _sb.storage.from('obra-anexos').remove([arquivo_path]);
    await _sb.from('obra_anexos').delete().eq('id', id);
    _cache.obra_anexos = _cache.obra_anexos.filter(a => a.id !== id); _persist();
  }

  // ── CLIENT TOKEN / CODIGO ─────────────────────────
  function generateClienteToken() { return Math.random().toString(36).slice(2, 10).toUpperCase(); }
  function generateCodigoCliente() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
  function regenerateCodigoCliente(id) {
    const codigo = generateCodigoCliente();
    updateObra(id, { codigo_cliente: codigo });
    return codigo;
  }

  // ── BACKUP HELPERS ────────────────────────────────
  function getAllRDOLinhas()    { return _cache.rdo_linhas; }
  function getAllObraUsuarios() { return _cache.obra_usuarios; }
  function getDataSize() {
    const bytes = JSON.stringify(_cache).length;
    return { kb: (bytes / 1024).toFixed(1), mb: (bytes / 1024 / 1024).toFixed(2) };
  }
  async function importAll(data) {
    // Delete in FK-safe order
    await _sb.from('obra_usuarios').delete().not('id_obra',    'is', null);
    await _sb.from('rdo_linhas').delete().not('id_linha',     'is', null);
    await _sb.from('rdos').delete().not('id_rdo',             'is', null);
    await _sb.from('obras').delete().not('id_obra',           'is', null);
    await _sb.from('usuarios').delete().not('id',             'is', null);
    // Insert in FK-safe order
    if (data.users?.length)         await _sb.from('usuarios').insert(data.users);
    if (data.obras?.length)         await _sb.from('obras').insert(data.obras);
    if (data.rdos?.length)          await _sb.from('rdos').insert(data.rdos);
    if (data.rdo_linhas?.length)    await _sb.from('rdo_linhas').insert(data.rdo_linhas);
    if (data.obra_usuarios?.length) await _sb.from('obra_usuarios').insert(data.obra_usuarios);
    return init();
  }
  async function deleteAll() {
    await _sb.from('obra_usuarios').delete().not('id_obra',  'is', null);
    await _sb.from('rdo_linhas').delete().not('id_linha',    'is', null);
    await _sb.from('rdos').delete().not('id_rdo',            'is', null);
    await _sb.from('obras').delete().not('id_obra',          'is', null);
    await _sb.from('usuarios').delete().not('id',            'is', null);
    _cache = { users: [], obras: [], rdos: [], rdo_linhas: [], obra_usuarios: [], obra_anexos: [] };
    if (_offline) { await IDB.set('kv', 'cache', _cache).catch(() => {}); await IDB.clear('outbox').catch(() => {}); _pending = 0; _emit(); }
  }

  return {
    init, uuid, sync, onSyncChange, getSyncState, isOnline, getPendingCount,
    getUsers, getUserByEmail, getUserById, createUser, updateUser, deleteUser,
    getObras, getObrasAtivas, getObraById, createObra, updateObra, deleteObra,
    getRDOs, getRDOById, getRDOsByData, getRDOByObraAndData, getRDOByObraDataUsuario, getRDOsByObraData, createRDO, updateRDO,
    getRDOLinhas, getLinha, upsertLinha,
    getObraUsuarios, getUserIdsByObra, getObrasByUsuario, setObraUsuarios, isUserInObra,
    generateClienteToken,
    getAllRDOLinhas, getAllObraUsuarios, getDataSize, importAll, deleteAll,
    getAnexosByObra, addAnexo, deleteAnexo,
    generateCodigoCliente, regenerateCodigoCliente
  };
})();
