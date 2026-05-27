const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();

console.log('[DASH] Access Dashboard iniciando...');
console.log('[DASH] Porta:', process.env.PORT || 3001);
console.log('[DASH] CF_TOKEN configurado?', process.env.CF_TOKEN ? 'SIM' : 'NAO - API Cloudflare nao vai funcionar');
console.log('[DASH] Zona UK: 8c5417878f88d14a648711efd68b56e4');
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend/dist')));
console.log('[DASH] Servindo estaticos de:', path.join(__dirname, 'frontend/dist'));

const CF_TOKEN = process.env.CF_TOKEN ;
const ZONE_UK = '8c5417878f88d14a648711efd68b56e4';
const API = 'https://api.cloudflare.com/client/v4';

// Helper to call Cloudflare API
function cf(path) {
  console.log('[CF] Chamando:', path);
  return new Promise((resolve, reject) => {
    https.get(`${API}${path}`, { headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

// Get all domains status
app.get('/api/domains', async (req, res) => {
  console.log('[API] GET /api/domains');
  try {
    const records = await cf(`/zones/${ZONE_UK}/dns_records?per_page=50`);
    console.log('[CF] Records recebidos:', records.result ? records.result.length : 0);
    const domains = (records.result || []).filter(r => r.type === 'A').map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      content: r.content,
      proxied: r.proxied,
      ttl: r.ttl,
      zone: 'devgiglio.uk'
    }));

    // Add known domains not in this zone
    const extra = [
      { id: 'custom-dokploy', name: 'dokploy.devgiglio.com', type: 'A', content: '173.249.60.169', proxied: false, zone: 'devgiglio.com (fora)' },
    ];

    console.log('[API] Retornando', domains.length, 'dominios +', extra.length, 'manuais');
    res.json([...domains, ...extra].sort((a, b) => a.name.localeCompare(b.name)));
  } catch(e) {
    console.log('[API] ERRO:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Toggle proxy on/off (proxied = protected, !proxied = DNS-only = public)
app.post('/api/domains/:id/toggle', async (req, res) => {
  console.log('[API] POST toggle id:', req.params.id, 'proxied:', req.body.proxied);
  try {
    const { id } = req.params;
    const { proxied } = req.body;

    const result = await cf(`/zones/${ZONE_UK}/dns_records/${id}`);
    const record = result.result;
    
    const update = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ ...record, proxied, ttl: 1 });
      const url = new URL(`${API}/zones/${ZONE_UK}/dns_records/${id}`);
      const options = {
        hostname: 'api.cloudflare.com',
        path: url.pathname + url.search,
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${CF_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      const req = https.request(options, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    res.json({ success: update.success, proxied: update.result?.proxied });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Access Dashboard API: http://0.0.0.0:${PORT}`));
