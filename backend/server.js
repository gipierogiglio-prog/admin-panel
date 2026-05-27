const http = require('http');
const CF_TOKEN = process.env.CF_TOKEN || '';
const ZONE_UK = '8c5417878f88d14a648711efd68b56e4';

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/api/domains' && req.method === 'GET') {
    httpsGet(`https://api.cloudflare.com/client/v4/zones/${ZONE_UK}/dns_records?per_page=50`, {
      headers: { 'Authorization': `Bearer ${CF_TOKEN}` }
    }).then(data => {
      const domains = (data.result || []).filter(r => r.type === 'A').map(r => ({ id: r.id, name: r.name, proxied: r.proxied }));
      domains.push({ id: 'custom', name: 'dokploy.devgiglio.com', proxied: false });
      res.end(JSON.stringify(domains));
    }).catch(e => { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); });
    return;
  }
  
  if (req.url === '/' && req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>Access Dashboard</h1><p>API: <a href="/api/domains">/api/domains</a></p>');
    return;
  }
  
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'not found' }));
}).listen(process.env.PORT || 3001, '0.0.0.0', () => console.log('[DASH] OK'));

function httpsGet(url, opts) {
  return new Promise((resolve, reject) => {
    if (!CF_TOKEN) return resolve({ result: [] });
    const u = new URL(url);
    const options = { hostname: u.hostname, path: u.pathname + u.search, headers: opts.headers };
    http.get(options, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{ resolve(JSON.parse(d)); }catch(e){ reject(e); } }); }).on('error', reject);
  });
}
