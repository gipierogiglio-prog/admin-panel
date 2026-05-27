const express = require('express');
const app = express();
app.use(express.static('frontend/dist'));
app.get('/api/domains', (req, res) => {
  res.json([{ name: 'test.devgiglio.uk', status: 'ok' }]);
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log('[DASH] OK:' + PORT));
