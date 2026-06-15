const path = require('path');
const express = require('express');

require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDir = __dirname;
const allowedRequestFields = [
  'contents',
  'system_instruction',
  'generationConfig',
  'safetySettings',
  'tools',
  'toolConfig'
];

function redactSecret(value, secret) {
  return JSON.parse(JSON.stringify(value).replaceAll(secret, '[redacted]'));
}

app.use(express.json({ limit: '35mb' }));

app.post('/api/gemini', async (req, res) => {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const model = typeof req.body?.model === 'string' ? req.body.model.trim() : '';

  if (!geminiApiKey) {
    return res.status(500).json({ error: { message: 'Gemini API key is not configured on the server.' } });
  }

  if (!model || !Array.isArray(req.body?.contents)) {
    return res.status(400).json({ error: { message: 'A model and contents array are required.' } });
  }

  const payload = Object.fromEntries(
    allowedRequestFields
      .filter((field) => req.body[field] !== undefined)
      .map((field) => [field, req.body[field]])
  );
  const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await upstream.json().catch(() => ({
      error: { message: `Gemini returned an invalid JSON response (${upstream.status}).` }
    }));

    return res.status(upstream.status).json(upstream.ok ? data : redactSecret(data, geminiApiKey));
  } catch (error) {
    const safeMessage = String(error?.message || 'Gemini request failed.').replaceAll(geminiApiKey, '[redacted]');
    return res.status(502).json({ error: { message: safeMessage } });
  }
});

app.get(['/server.js', '/package.json', '/package-lock.json', '/.env.example'], (_req, res) => {
  res.sendStatus(404);
});
app.use(express.static(publicDir, { dotfiles: 'deny' }));

app.listen(port, () => {
  console.log(`RE:WORK server listening on http://localhost:${port}`);
});
