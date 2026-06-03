// pw-offline-test.cjs — valida o PWA offline em navegador REAL (Chromium via Playwright).
// NÃO grava no Supabase: a escrita de teste é feita OFFLINE e a outbox é limpa antes
// de fechar; o contexto do Playwright é efêmero (IndexedDB descartado no close).
// db.js/idb.js declaram `const DB`/`const IDB` (escopo léxico global) -> acessar como
// `DB`/`IDB` direto no evaluate (NAO existem em window.*).
// Rodar:  $env:PLAYWRIGHT_BROWSERS_PATH="E:\pw-browsers"; node pw-offline-test.cjs
// (precisa do _serve.js rodando em :8123 e de internet na 1a carga)
const { chromium } = require('playwright');
const http = require('http');

const BASE = 'http://localhost:8123';
const results = [];
function check(name, ok, extra = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`);
}
function ping() {
  return new Promise(res => {
    const r = http.get(BASE + '/index.html', x => { res(x.statusCode >= 200 && x.statusCode < 400); x.resume(); });
    r.on('error', () => res(false));
    r.setTimeout(2000, () => { r.destroy(); res(false); });
  });
}
async function waitServer(ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await ping()) return true; await new Promise(r => setTimeout(r, 500)); }
  return false;
}

(async () => {
  const up = await waitServer();
  check('Servidor _serve.js respondendo em ' + BASE, up);
  if (!up) process.exit(1);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource|Failed to fetch/.test(t))
      console.log('   [console.error]', t);
  });

  // 1) ONLINE: carrega index.html -> registra SW + DB.init() busca do Supabase
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  let swOk = false;
  try { await page.evaluate(() => navigator.serviceWorker.ready); swOk = true; } catch (e) {}
  check('Service Worker registrado e ativo', swOk);

  await page.waitForFunction(() => typeof DB !== 'undefined', null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(4500); // deixa o init() buscar do Supabase

  const dbExists = await page.evaluate(() => typeof DB !== 'undefined' && typeof IDB !== 'undefined');
  check('db.js/idb.js carregados (DB + IDB)', dbExists);

  const sync = await page.evaluate(() => (typeof DB !== 'undefined') ? DB.getSyncState() : null);
  check('Modo offline habilitado (IndexedDB detectado)', !!(sync && sync.offlineEnabled), JSON.stringify(sync));

  const cache = await page.evaluate(async () => {
    const keys = await caches.keys(); if (!keys.length) return { keys: [], n: 0 };
    const c = await caches.open(keys[0]); const reqs = await c.keys();
    return { keys, n: reqs.length };
  });
  check('App shell no Cache Storage (SW pre-cache)', cache.n > 0, `cache=${cache.keys} itens=${cache.n}`);

  const snap = await page.evaluate(async () => {
    try { const s = await IDB.get('kv', 'cache'); return { has: !!s, users: s && s.users ? s.users.length : 0, obras: s && s.obras ? s.obras.length : 0 }; }
    catch (e) { return { err: String(e) }; }
  });
  check('Snapshot persistido no IndexedDB (kv/cache)', !!snap.has, JSON.stringify(snap));
  check('Usuarios baixados p/ login offline', (snap.users || 0) > 0, `users=${snap.users}`);

  // 2) OFFLINE: app abre sem rede (SW serve do cache)
  await ctx.setOffline(true);
  try {
    const resp = await page.goto(BASE + '/campo/rdo.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const html = (await page.content()).length;
    check('App ABRE offline (campo/rdo.html do cache)', !!resp && html > 500, `status=${resp && resp.status()} htmlLen=${html} title="${await page.title()}"`);
  } catch (e) {
    check('App ABRE offline (campo/rdo.html do cache)', false, String(e));
  }

  // 3) OFFLINE: escrita cai na outbox (fila) e persiste — DIAGNOSTICO de timing/sync
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof DB !== 'undefined', null, { timeout: 10000 }).catch(() => {});
  const q = await page.evaluate(async () => {
    const log = { offlineEnabled: DB.getSyncState().offlineEnabled, before: DB.getPendingCount() };
    DB.createObra({ nome_obra: '__TESTE_OFFLINE_PW__', status_obra: 'Ativa' }); // local, offline
    await new Promise(r => setTimeout(r, 60));
    log.count_60ms = await IDB.count('outbox');     // logo apos enfileirar (antes do sync drenar)
    await new Promise(r => setTimeout(r, 1200));
    log.count_1200ms = await IDB.count('outbox');   // depois que o sync() rodou
    log.pending_final = DB.getPendingCount();
    // o supabase-js, OFFLINE, LANCA excecao ou RETORNA {error}? (decide se o item e' mantido)
    try {
      const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      const res = await sb.from('obras').insert({ id_obra: DB.uuid(), nome_obra: '__PROBE__', status_obra: 'Ativa' });
      log.supabase = res && res.error ? ('RETORNOU {error}: ' + (res.error.message || '?')) : 'OK (sem erro?!)';
    } catch (e) { log.supabase = 'LANCOU: ' + String(e); }
    return log;
  });
  const enfileirou = q.count_60ms > 0;
  const persistiu = q.count_1200ms > 0;
  check('Escrita offline entra na outbox (logo apos)', enfileirou, JSON.stringify(q));
  check('Escrita offline PERMANECE na fila p/ sync futuro', persistiu,
        persistiu ? '' : '>> sync() DESCARTOU o item (supabase nao lancou excecao offline)');

  // limpa a outbox local -> garante que nada suba ao Supabase mesmo se reconectasse
  await page.evaluate(async () => { try { await IDB.clear('outbox'); } catch (e) {} });

  await browser.close();
  const fails = results.filter(r => !r.ok).length;
  console.log(`\n==== RESULTADO: ${results.length - fails}/${results.length} OK ====`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ERRO FATAL:', e); process.exit(2); });
