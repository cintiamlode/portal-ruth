const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors({ origin: 'https://cintiamlode.github.io' }));
app.use(express.json());

const CLIENT_ID = process.env.CA_CLIENT_ID;
const CLIENT_SECRET = process.env.CA_CLIENT_SECRET;
const API_BASE = 'https://api-v2.contaazul.com';
const AUTH_BASE = 'https://auth.contaazul.com';

app.post('/auth/token', async (req, res) => {
  try {
    const { code, redirect_uri, refresh_token, grant_type } = req.body;
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const body = new URLSearchParams({ grant_type: grant_type || 'authorization_code' });
    if (code) { body.append('code', code); body.append('redirect_uri', redirect_uri); }
    if (refresh_token) body.append('refresh_token', refresh_token);
    const r = await fetch(`${AUTH_BASE}/oauth2/token`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/*', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'Token obrigatório' });
    const path = req.params[0];
    const query = new URLSearchParams(req.query).toString();
    const url = `${API_BASE}/v1/${path}${query ? '?' + query : ''}`;
    const r = await fetch(url, { headers: { 'Authorization': token } });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor C2B rodando na porta ${PORT}`));
