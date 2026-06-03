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

// Lançamentos — testa todos os filtros de data possíveis
app.get('/lancamentos/:tipo', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'Token obrigatorio' });
    const ep = req.params.tipo === 'receitas' ? 'contas-a-receber' : 'contas-a-pagar';
    
    const { tamanhoPagina, pagina, centroDeCustoId,
            dataInicioCompetencia, dataFimCompetencia,
            dataInicioPagamento, dataFimPagamento,
            dataInicioVencimento, dataFimVencimento } = req.query;

    const ini = dataInicioCompetencia || dataInicioPagamento || dataInicioVencimento;
    const fim = dataFimCompetencia || dataFimPagamento || dataFimVencimento;

    // Monta todos os campos de data que a API aceita
    const params = new URLSearchParams();
    if (dataInicioCompetencia) params.append('dataInicioCompetencia', dataInicioCompetencia);
    if (dataFimCompetencia) params.append('dataFimCompetencia', dataFimCompetencia);
    if (dataInicioPagamento) params.append('dataInicioPagamento', dataInicioPagamento);
    if (dataFimPagamento) params.append('dataFimPagamento', dataFimPagamento);
    // Vencimento é OBRIGATÓRIO pela API — usa as mesmas datas do filtro principal
    params.append('dataInicioVencimento', dataInicioVencimento || ini);
    params.append('dataFimVencimento', dataFimVencimento || fim);
    params.append('tamanhoPagina', tamanhoPagina || 500);
    params.append('pagina', pagina || 0);
    if (centroDeCustoId) params.append('centroDeCustoId', centroDeCustoId);

    const url = `${API}/financeiro/eventos-financeiros/${ep}/buscar?${params}`;
    console.log('GET', ep, params.toString().substring(0, 120));

    const r = await fetch(url, { headers: { 'Authorization': token } });
    const data = await r.json();
    console.log('  ->', r.status, 'n=', data?.content?.length ?? data?.length ?? JSON.stringify(data).substring(0, 80));
    res.status(r.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/centros', async (req, res) => {
  try {
    const token = req.headers.authorization;
    const params = new URLSearchParams({ tamanhoPagina: 200, pagina: 0 });
    const url = `${API}/centro-de-custo?${params}`;
    console.log('GET centros');
    const r = await fetch(url, { headers: { 'Authorization': token } });
    const data = await r.json();
    console.log('  -> centros n=', data?.content?.length ?? data?.length ?? '?');
    res.status(r.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', (_, res) => res.json({ ok: true }));
app.listen(process.env.PORT || 3000, () => console.log('Servidor C2B ok'));
