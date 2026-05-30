// Servidor estático local p/ inspeção (sem dependências). Uso: node _serve.js [porta]
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 8123;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml',
};

// Lê .env e retorna objeto chave→valor
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};
  return fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
    const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (m) acc[m[1]] = m[2];
    return acc;
  }, {});
}

// Gera config.js dinamicamente a partir do .env
function buildConfigJs(env) {
  const get = (k, fb = '') => (env[k] || fb).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return [
    `window.SUPABASE_URL = '${get('VITE_SUPABASE_URL')}';`,
    `window.SUPABASE_ANON_KEY = '${get('VITE_SUPABASE_ANON_KEY')}';`,
    `window.ASSINAFY_ACCOUNT_ID = '${get('ASSINAFY_ACCOUNT_ID')}';`,
  ].join('\n') + '\n';
}

http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    // config.js servido dinamicamente a partir do .env
    if (urlPath === '/assets/js/config.js') {
      const content = buildConfigJs(loadEnv());
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(content);
    }

    // Proxy Assinafy — espelha o nginx de produção
    if (urlPath.startsWith('/assinafy-proxy/')) {
      const env = loadEnv();
      const apiKey = env['ASSINAFY_API_KEY'] || '';
      const apiPath = urlPath.replace('/assinafy-proxy', '');
      const target = `https://api.assinafy.com.br/v1${apiPath}`;

      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const body = chunks.length ? Buffer.concat(chunks) : null;
        const headers = { 'Authorization': `Bearer ${apiKey}`, 'Host': 'api.assinafy.com.br' };
        if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
        if (body) headers['Content-Length'] = body.length;

        const url = new URL(target);
        const opts = { hostname: url.hostname, path: url.pathname + (req.url.includes('?') ? '?' + req.url.split('?')[1] : ''), method: req.method, headers };
        const pr = https.request(opts, (pr2) => {
          res.writeHead(pr2.statusCode, { 'Content-Type': pr2.headers['content-type'] || 'application/json', 'Access-Control-Allow-Origin': '*' });
          pr2.pipe(res);
        });
        pr.on('error', e => { res.writeHead(502); res.end(JSON.stringify({ message: e.message })); });
        if (body) pr.write(body);
        pr.end();
      });
      return;
    }

    let filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) { res.writeHead(404); return res.end('404: ' + urlPath); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.writeHead(500); res.end('500: ' + e.message);
  }
}).listen(PORT, () => console.log('Servindo ' + ROOT + ' em http://localhost:' + PORT + '/'));
