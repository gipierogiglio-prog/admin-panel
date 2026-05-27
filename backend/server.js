const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const CF_TOKEN = process.env.CF_TOKEN || Buffer.from('Y2Z1dF9WNEhwNUhsY05CMk9WZms1T0RVQ25zSzJqQ2Z6Z1RNOVpZa2w0VmtOM2VhMjUyYzM=', 'base64').toString();
const ZONE_UK = '8c5417878f88d14a648711efd68b56e4';
const DIST = path.join(__dirname, 'frontend/dist');
const CONFIG_FILE = '/data/access-config.json';

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

// Protection config: { "domain.com": "cloudflare"|"wireguard"|"none" }
function loadConfig() {
  try { if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); } catch(e) {}
  return {};
}
function saveConfig(cfg) {
  try { fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true }); fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); return true; } catch(e) { return false; }
}

// Fetch domains from Cloudflare
function fetchCF() {
  return new Promise((resolve, reject) => {
    if (!CF_TOKEN) return resolve([]);
    const u = new URL(`https://api.cloudflare.com/client/v4/zones/${ZONE_UK}/dns_records?per_page=50`);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, headers: { 'Authorization': `Bearer ${CF_TOKEN}` } };
    https.get(opts, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{ resolve(JSON.parse(d).result || []); }catch(e){ reject(e); } }); }).on('error', reject);
  });
}

function serveStatic(url, res) {
  let filePath = url === '/' ? '/index.html' : url;
  const fullPath = path.join(DIST, filePath);
  if (!fullPath.startsWith(DIST)) { res.statusCode = 403; res.end(); return; }
  fs.readFile(fullPath, (err, data) => {
    if (err) { res.statusCode = 404; res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(data);
  });
}

function readBody(req) {
  return new Promise(resolve => { let b=''; req.on('data',c=>b+=c); req.on('end',()=>resolve(b)); });
}

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = req.url.split('?')[0];

  // GET /api/domains - list with protection status
  if (url === '/api/domains' && req.method === 'GET') {
    try {
      const config = loadConfig();
      const records = await fetchCF();
      const domains = records.filter(r => r.type === 'A').map(r => ({
        id: r.id, name: r.name, content: r.content, proxied: r.proxied,
        protection: config[r.name] || 'none'
      }));
      // Add manually configured domains not in CF
      for (const [name, type] of Object.entries(config)) {
        if (!domains.find(d => d.name === name)) {
          domains.push({ id: 'manual-' + name, name, content: '-', proxied: false, protection: type });
        }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(domains.sort((a, b) => a.name.localeCompare(b.name))));
    } catch(e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // POST /api/protection/set - set protection for a domain
  if (url === '/api/protection/set' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const config = loadConfig();
    if (body.type === 'none') delete config[body.name];
    else config[body.name] = body.type;
    saveConfig(config);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // POST /api/protection/add - add a manually configured domain
  if (url === '/api/protection/add' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const config = loadConfig();
    config[body.name] = body.type;
    saveConfig(config);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
    return;
  }

  serveStatic(url, res);
}).listen(process.env.PORT || 3001, '0.0.0.0', () => console.log('[DASH] OK'));
