// sw.js — Service Worker (PWA): cacheia o "app shell" para abrir sem internet.
// Estratégia: network-first com fallback para cache (mesma origem).
// Chamadas de API do Supabase (outra origem) NÃO são interceptadas — vão direto
// à rede; offline elas falham e o db.js enfileira/sincroniza depois.
const CACHE = 'rdo-shell-v1';

const SHELL = [
  './',
  './index.html',
  './campo/home.html',
  './campo/rdo.html',
  './campo/assinatura.html',
  './assets/css/output.css',
  './assets/js/config.js',
  './assets/js/idb.js',
  './assets/js/db.js',
  './assets/js/auth.js',
  './assets/js/utils.js',
  './assets/js/ui.js',
  './assets/js/pdf-gen.js',
  './assets/js/vendor/supabase.min.js',
  './assets/js/vendor/jspdf.umd.min.js',
  './assets/img/logo.png',
  './faviconemodular/favicon.ico',
  './faviconemodular/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u)))) // não falha tudo se 1 asset faltar
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase/API e demais origens: deixa passar

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
