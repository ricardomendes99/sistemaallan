// Data layer — Supabase-backed with in-memory cache
// All read methods are synchronous (from cache).
// All write methods update cache immediately and fire Supabase writes in background.
// Only DB.init() is async and must be awaited before any use.
const DB = (() => {
  const SUPABASE_URL = window.SUPABASE_URL  || '';
  const SUPABASE_KEY = window.SUPABASE_ANON_KEY || '';
  const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let _cache = { users: [], obras: [], rdos: [], rdo_linhas: [], obra_usuarios: [], obra_anexos: [] };

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Fire-and-forget: runs async write, logs errors silently
  function _bg(promise) {
    promise.then(({ error }) => { if (error) console.error('[DB write]', error); });
  }

  async function init() {
    const [u, o, r, rl, ou, oa] = await Promise.all([
      _sb.from('usuarios').select('*'),
      _sb.from('obras').select('*'),
      _sb.from('rdos').select('*'),
      _sb.from('rdo_linhas').select('*'),
      _sb.from('obra_usuarios').select('*'),
      _sb.from('obra_anexos').select('*')
    ]);
    _cache.users         = u.data  || [];
    _cache.obras         = o.data  || [];
    _cache.rdos          = r.data  || [];
    _cache.rdo_linhas    = rl.data || [];
    _cache.obra_usuarios = ou.data || [];
    _cache.obra_anexos   = oa.data || [];

    // Seed admin user if database is empty
    if (_cache.users.length === 0) {
      const admin = {
        id: uuid(), nome_completo: 'Administrador', email: 'admin@modular.com',
        senha_hash: btoa('admin123'), perfil: 'ADMIN', funcao_principal: 'Encarregado', ativo: true
      };
      await _sb.from('usuarios').insert(admin);
      _cache.users = [admin];
    }
  }

  // ── USERS ──────────────────────────────────────────
  function getUsers()            { return _cache.users; }
  function getUserByEmail(email) { return _cache.users.find(u => u.email.toLowerCase() === email.toLowerCase()); }
  function getUserById(id)       { return _cache.users.find(u => u.id === id); }

  function createUser(data) {
    const user = { id: uuid(), ativo: true, ...data };
    _cache.users.push(user);
    _bg(_sb.from('usuarios').insert(user));
    return user;
  }
  function updateUser(id, data) {
    _cache.users = _cache.users.map(u => u.id === id ? { ...u, ...data } : u);
    _bg(_sb.from('usuarios').update(data).eq('id', id));
  }
  function deleteUser(id) {
    _cache.users = _cache.users.filter(u => u.id !== id);
    _bg(_sb.from('usuarios').delete().eq('id', id));
  }

  // ── OBRAS ──────────────────────────────────────────
  function getObras()       { return _cache.obras; }
  function getObrasAtivas() { return _cache.obras.filter(o => o.status_obra === 'Ativa'); }
  function getObraById(id)  { return _cache.obras.find(o => o.id_obra === id); }

  function createObra(data) {
    const obra = { id_obra: uuid(), data_cadastro: new Date().toISOString(), codigo_cliente: generateCodigoCliente(), ...data };
    _cache.obras.push(obra);
    _bg(_sb.from('obras').insert(obra));
    return obra;
  }
  function updateObra(id, data) {
    _cache.obras = _cache.obras.map(o => o.id_obra === id ? { ...o, ...data } : o);
    _bg(_sb.from('obras').update(data).eq('id_obra', id));
  }
  function deleteObra(id) {
    _cache.obras = _cache.obras.filter(o => o.id_obra !== id);
    _bg(_sb.from('obras').delete().eq('id_obra', id));
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
    _cache.rdos.push(rdo);
    _bg(_sb.from('rdos').insert(rdo));
    return rdo;
  }
  function updateRDO(id, data) {
    _cache.rdos = _cache.rdos.map(r => r.id_rdo === id ? { ...r, ...data } : r);
    _bg(_sb.from('rdos').update({ ...data, updated_at: new Date().toISOString() }).eq('id_rdo', id));
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
    _bg(_sb.from('rdo_linhas').upsert(linha, { onConflict: 'id_rdo,horario_ponto' }));
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
    (async () => {
      await _sb.from('obra_usuarios').delete().eq('id_obra', id_obra);
      if (user_ids.length > 0) {
        const { error } = await _sb.from('obra_usuarios').insert(user_ids.map(id_usuario => ({ id_obra, id_usuario })));
        if (error) console.error('[DB] setObraUsuarios:', error);
      }
    })();
  }
  function isUserInObra(id_obra, id_usuario) { return getUserIdsByObra(id_obra).includes(id_usuario); }

  // ── OBRA ANEXOS ───────────────────────────────────
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
    _cache.obra_anexos.push(anexo);
    return anexo;
  }
  async function deleteAnexo(id, arquivo_path) {
    await _sb.storage.from('obra-anexos').remove([arquivo_path]);
    await _sb.from('obra_anexos').delete().eq('id', id);
    _cache.obra_anexos = _cache.obra_anexos.filter(a => a.id !== id);
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
  }

  return {
    init, uuid,
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
