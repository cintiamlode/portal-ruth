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

app.get('/lancamentos/:tipo', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'Token obrigatorio' });
    const ep = req.params.tipo === 'receitas' ? 'contas-a-receber' : 'contas-a-pagar';

    const ini = req.query.dataInicioCompetencia || req.query.dataInicioPagamento || req.query.dataInicioVencimento;
    const fim = req.query.dataFimCompetencia || req.query.dataFimPagamento || req.query.dataFimVencimento;

    const params = new URLSearchParams();
    if (req.query.dataInicioCompetencia) params.append('dataInicioCompetencia', req.query.dataInicioCompetencia);
    if (req.query.dataFimCompetencia) params.append('dataFimCompetencia', req.query.dataFimCompetencia);
    if (req.query.dataInicioPagamento) params.append('dataInicioPagamento', req.query.dataInicioPagamento);
    if (req.query.dataFimPagamento) params.append('dataFimPagamento', req.query.dataFimPagamento);
    // A API exige estes dois campos com snake_case E sufixos _de/_ate
    params.append('data_vencimento_de', ini);
    params.append('data_vencimento_ate', fim);
    params.append('tamanhoPagina', req.query.tamanhoPagina || 500);
    params.append('pagina', req.query.pagina || 0);
    if (req.query.centroDeCustoId) params.append('centroDeCustoId', req.query.centroDeCustoId);

    const url = `${API}/financeiro/eventos-financeiros/${ep}/buscar?${params}`;
    console.log('GET', ep, params.toString().substring(0, 150));

    const r = await fetch(url, { headers: { 'Authorization': token } });
    const data = await r.json();
    console.log('  ->', r.status, 'n=', data?.content?.length ?? JSON.stringify(data).substring(0, 80));
    res.status(r.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/centros', async (req, res) => {
  try {
    const token = req.headers.authorization;
    const url = `${API}/centro-de-custo?tamanhoPagina=200&pagina=0`;
    console.log('GET centros');
    const r = await fetch(url, { headers: { 'Authorization': token } });
    const data = await r.json();
    console.log('  -> centros n=', data?.content?.length ?? data?.length ?? JSON.stringify(data).substring(0,100));
    res.status(r.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', (_, res) => res.json({ ok: true }));
app.listen(process.env.PORT || 3000, () => console.log('Servidor C2B ok'));
