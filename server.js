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

// A API do Conta Azul v2 usa snake_case com sufixos _de/_ate
// Parâmetros aceitos: data_vencimento_de, data_vencimento_ate (OBRIGATÓRIOS)
//                    data_competencia_de, data_competencia_ate (opcionais)
//                    data_pagamento_de, data_pagamento_ate (opcionais)
//                    ids_centros_de_custo (opcional, lista separada por vírgula)
//                    pagina, tamanho_pagina

app.get('/lancamentos/:tipo', async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'Token obrigatorio' });
    const ep = req.params.tipo === 'receitas' ? 'contas-a-receber' : 'contas-a-pagar';

    // Recebe datas no formato YYYY-MM-DD
    const ini = req.query.ini;
    const fim = req.query.fim;
    const modo = req.query.modo || 'competencia'; // competencia | pagamento
    const centro = req.query.centro;

    const params = new URLSearchParams();
    // Vencimento é SEMPRE obrigatório
    params.append('data_vencimento_de', ini);
    params.append('data_vencimento_ate', fim);
    // Filtro principal conforme modo
    if (modo === 'competencia') {
      params.append('data_competencia_de', ini);
      params.append('data_competencia_ate', fim);
    } else {
      params.append('data_pagamento_de', ini);
      params.append('data_pagamento_ate', fim);
    }
    params.append('tamanho_pagina', 500);
    params.append('pagina', req.query.pagina || 1);
    if (centro) params.append('ids_centros_de_custo', centro);

    const url = `${API}/financeiro/eventos-financeiros/${ep}/buscar?${params}`;
    console.log('GET', ep, params.toString().substring(0, 150));

    const r = await fetch(url, { headers: { 'Authorization': token } });
    const data = await r.json();
    console.log('  ->', r.status, 'n=', data?.content?.length ?? JSON.stringify(data).substring(0, 100));
    res.status(r.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/centros', async (req, res) => {
  try {
    const token = req.headers.authorization;
    const url = `${API}/centro-de-custo?tamanho_pagina=200&pagina=1`;
    console.log('GET centros');
    const r = await fetch(url, { headers: { 'Authorization': token } });
    const data = await r.json();
    console.log('  -> centros:', JSON.stringify(data).substring(0, 200));
    res.status(r.status).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', (_, res) => res.json({ ok: true }));
app.listen(process.env.PORT || 3000, () => console.log('Servidor C2B ok'));
