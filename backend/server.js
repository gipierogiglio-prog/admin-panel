const http = require('http');
const fs = require('fs');
const path = require('path');

const CF_TOKEN = process.env.CF_TOKEN || Buffer.from('Y2Z1dF9WNEhwNUhsY05CMk9WZms1T0RVQ25zSzJqQ2Z6Z1RNOVpZa2w0VmtOM2VhMjUyYzM=', 'base64').toString();
const ZONE_UK = '8c5417878f88d14a648711efd68b56e4';
const DIST = path.join(__dirname, 'frontend/dist');

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

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

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.url === '/api/domains' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    httpsGet(`https://api.cloudflare.com/client/v4/zones/${ZONE_UK}/dns_records?per_page=50`).then(data => {
      const domains = (data.result || []).filter(r => r.type === 'A').map(r => ({ id: r.id, name: r.name, type: r.type, content: r.content, proxied: r.proxied, ttl: r.ttl, zone: 'devgiglio.uk' }));
      domains.push({ id: 'custom-dokploy', name: 'dokploy.devgiglio.com', type: 'A', content: '173.249.60.169', proxied: false, zone: 'devgiglio.com (fora)' });
      res.end(JSON.stringify(domains.sort((a, b) => a.name.localeCompare(b.name))));
    }).catch(e => { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); });
    return;
  }
  
  // Serve the React frontend (SPA - all routes go to index.html)
  serveStatic(req.url, res);
}).listen(process.env.PORT || 3001, '0.0.0.0', () => console.log('[DASH] OK'));

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    if (!CF_TOKEN) return resolve({ result: [] });
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, headers: { 'Authorization': `Bearer ${CF_TOKEN}` } };
    http.get(opts, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{ resolve(JSON.parse(d)); }catch(e){ reject(e); } }); }).on('error', reject);
  });
}
