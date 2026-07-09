const express = require('express');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_TAB = process.env.GOOGLE_SHEET_TAB || 'Respostas';
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
// Private key comes from an env var, so newlines are usually escaped as \n — restore them here.
const SERVICE_ACCOUNT_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const COLUMNS = ['ts', 'name', 'area', 'level', 'tools', 'focus', 'goal', 'blocker', 'suggestion'];

let sheetsClient = null;
function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_KEY || !SHEET_ID) {
    throw new Error(
      'Credenciais do Google Sheets não configuradas. Defina GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY e GOOGLE_SHEET_ID.'
    );
  }
  const auth = new google.auth.JWT(
    SERVICE_ACCOUNT_EMAIL,
    null,
    SERVICE_ACCOUNT_KEY,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Basic payload validation — mirrors the two required fields from the form.
function validatePayload(body) {
  if (!body || typeof body !== 'object') return 'Payload inválido.';
  if (!body.level) return 'Campo "level" é obrigatório.';
  if (!body.focus) return 'Campo "focus" é obrigatório.';
  return null;
}

app.post('/api/submit', async (req, res) => {
  const error = validatePayload(req.body);
  if (error) return res.status(400).json({ error });

  const row = [
    new Date(req.body.ts || Date.now()).toISOString(),
    req.body.name || '',
    req.body.area || '',
    req.body.level || '',
    Array.isArray(req.body.tools) ? req.body.tools.join('; ') : '',
    req.body.focus || '',
    req.body.goal || '',
    req.body.blocker || '',
    req.body.suggestion || ''
  ];

  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A:I`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao gravar no Google Sheets:', err.message);
    res.status(502).json({ error: 'Não foi possível gravar a resposta agora.' });
  }
});

app.get('/api/results', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A2:I`
    });
    const rows = result.data.values || [];
    const responses = rows.map(r => ({
      ts: r[0] ? new Date(r[0]).getTime() : null,
      name: r[1] || '',
      area: r[2] || '',
      level: r[3] || '',
      tools: r[4] ? r[4].split(';').map(t => t.trim()).filter(Boolean) : [],
      focus: r[5] || '',
      goal: r[6] || '',
      blocker: r[7] || '',
      suggestion: r[8] || ''
    }));
    res.json(responses);
  } catch (err) {
    console.error('Erro ao ler do Google Sheets:', err.message);
    res.status(502).json({ error: 'Não foi possível carregar os resultados agora.' });
  }
});

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Censo da Guilda de IA rodando na porta ${PORT}`);
});
