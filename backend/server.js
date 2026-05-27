const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend/dist')));

const CF_TOKEN = process.env.CF_TOKEN || '';
const ZONE_UK = '8c5417878f88d14a648711efd68b56e4';

app.get('/api/domains', async (req, res) => {
  try {
    if (!CF_TOKEN) {
      res.json([{ id: 'no-token', name: 'CF_TOKEN nao configurado', type: '-', content: '-', proxied: false, zone: 'Configurar env var no Dokploy' }]);
      return;
    }
    const data = await new Promise((resolve, reject) => {
      https.get(`https://api.cloudflare.com/client/v4/zones/${ZONE_UK}/dns_records?per_page=50`, {
        headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' }
      }, (r) => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{resolve(JSON.parse(d))}catch(e){reject(e)} }); }).on('error', reject);
    });
    const domains = (data.result || []).filter(r => r.type === 'A').map(r => ({ id: r.id, name: r.name, type: r.type, content: r.content, proxied: r.proxied, ttl: r.ttl, zone: 'devgiglio.uk' }));
    domains.push({ id: 'custom-dokploy', name: 'dokploy.devgiglio.com', type: 'A', content: '173.249.60.169', proxied: false, zone: 'devgiglio.com (fora)' });
    res.json(domains.sort((a, b) => a.name.localeCompare(b.name)));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/domains/:id/toggle', async (req, res) => {
  try {
    const { id, proxied } = req.params;
    const data = JSON.stringify({ proxied: req.body.proxied, ttl: 1 });
    const result = await new Promise((resolve, reject) => {
      const r = https.request(`https://api.cloudflare.com/client/v4/zones/${ZONE_UK}/dns_records/${id}`, {
        method: 'PATCH', headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      }, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d))}catch(e){reject(e)} }); });
      r.on('error', reject); r.write(data); r.end();
    });
    res.json({ success: result.success, proxied: result.result?.proxied });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 3001, '0.0.0.0', () => console.log('[DASH] OK'));
