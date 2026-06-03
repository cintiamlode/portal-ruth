const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const CLIENT_ID = process.env.CA_CLIENT_ID;
const CLIENT_SECRET = process.env.CA_CLIENT_SECRET;
const API = 'https://api-v2.contaazul.com/v1';
const AUTH = 'https://auth.contaazul.com';

// Auth
app.post('/auth/token', async (req, res) => {
  try {
    const { code, redirect_uri, refresh_token, grant_type } = req.body;
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const body = new URLSearchParams({ grant_type: grant_type || 'authorization_code' });
    if (code) { body.append('code', code); body.append('redirect_uri', redirect_uri); }
    if (refresh_token) body.append('refresh_token', refresh_token);
    const r = await fetch(`${AUTH}/oauth2/token`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await r.json();
    res.status(r.ok ? 200 : r.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Lançamentos — injeta data_vencimento obrigatória
app.get('/lancamentos/:tipo', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'Token obrigatorio' });
    const ep = req.params.tipo === 'receitas' ? 'contas-a-receber' : 'contas-a-pagar';
    const p = { ...req.query };
    // A API exige data_vencimento_de e data_vencimento_ate obrigatoriamente
    const ini = p.dataInicioCompetencia || p.dataInicioPagamento || p.dataInicioVencimento;
    const fim = p.dataFimCompetencia || p.dataFimPagamento || p.dataFimVencimento;
    if (ini) p.dataInicioVencimento = p.dataInicioVencimento || ini;
    if (fim) p.dataFimVencimento = p.dataFimVencimento || fim;
    const url = `${API}/financeiro/eventos-financeiros/${ep}/buscar?${new URLSearchParams(p)}`;
    console.log('GET', ep, url.split('?')[1]?.substring(0, 100));
    const r = await fetch(url, { headers: { 'Authorization': token } });
    const data = await r.json();
    console.log('  ->', r.status, 'n=', data?.content?.length ?? data?.length ?? '?');
    res.status(r.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Centros de custo
app.get('/centros', async (req, res) => {
  try {
    const token = req.headers.authorization;
    const url = `${API}/centro-de-custo?${new URLSearchParams(req.query)}`;
    console.log('GET centros');
    const r = await fetch(url, { headers: { 'Authorization': token } });
    const data = await r.json();
    console.log('  -> centros n=', data?.content?.length ?? data?.length ?? '?');
    res.status(r.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 3000, () => console.log('Servidor C2B ok'));
