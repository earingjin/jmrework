const path = require('path');
const fs = require('fs');
const express = require('express');

require('dotenv').config();

const {
  adminRequired,
  authRequired,
  createRateLimit,
  requireJwtSecret
} = require('./lib/auth');

requireJwtSecret();

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDir = __dirname;
const logDir = path.join(__dirname, 'logs');
const geminiErrorLogPath = path.join(logDir, 'gemini-errors.jsonl');
const usageEventLogPath = path.join(logDir, 'usage-events.jsonl');
const geminiRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many AI requests. Please try again later.'
});
const allowedRequestFields = [
  'contents',
  'system_instruction',
  'generationConfig',
  'safetySettings',
  'tools',
  'toolConfig'
];

// optional DB integration
const db = require('./lib/db');
const usageEventsDb = require('./routes/usageEvents');

// initialize DB pool if configured
try { db.init(); } catch (e) { console.error('DB init failed', e); }

function redactSecret(value, secret) {
  return JSON.parse(JSON.stringify(value).replaceAll(secret, '[redacted]'));
}

function geminiErrorMessage(value, secret) {
  return String(value || 'Gemini request failed.').replaceAll(secret, '[redacted]').slice(0, 2000);
}

function recordGeminiError(model, status, message) {
  const entry = {
    model: model || 'unknown',
    status: Number(status) || 0,
    message: String(message || 'Gemini request failed.'),
    occurredAt: new Date().toISOString()
  };
  console.error('[gemini-error]', entry);
  fs.promises.appendFile(geminiErrorLogPath, `${JSON.stringify(entry)}\n`, 'utf8')
    .catch((error) => console.error('[gemini-error-log-failed]', error));
}

function sanitizeUsagePayload(payload) {
  const allowedFields = [
    'reportType',
    'finalStatus',
    'durationMs',
    'status',
    'errorName',
    'errorType',
    'errorMessage',
    'reason',
    'counselorId',
    'counselorName',
    'branch',
    'tokenUsage',
    'retryCount',
    'retryReason',
    'recoveryType',
    'startedAt',
    'finishReason',
    'parseStage',
    'modelName',
    'parseSuccess',
    'autoRepairAttempted',
    'autoRepairSuccess',
    'jsonRepairAttempted',
    'jsonRepairSuccess',
    'regenerateAttempted',
    'regenerateSuccess'
  ];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  return Object.fromEntries(
    allowedFields
      .filter((field) => payload[field] !== undefined)
      .map((field) => [field, payload[field]])
  );
}

function normalizeUsageEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  const eventName = typeof event.eventName === 'string' ? event.eventName.trim() : '';
  if (!eventName) return null;
  const recordedAt = event.recordedAt && !Number.isNaN(new Date(event.recordedAt).getTime())
    ? new Date(event.recordedAt).toISOString()
    : new Date().toISOString();
  return {
    id: typeof event.id === 'string' ? event.id.slice(0, 120) : '',
    eventName: eventName.slice(0, 120),
    payload: sanitizeUsagePayload(event.payload),
    recordedAt
  };
}

async function appendUsageEvents(events) {
  const normalized = events.map(normalizeUsageEvent).filter(Boolean);
  if (!normalized.length) return [];
  // always append to local file (existing behaviour)
  await fs.promises.appendFile(
    usageEventLogPath,
    normalized.map((event) => JSON.stringify(event)).join('\n') + '\n',
    'utf8'
  );

  // if DB configured, try to persist there as well; failures should not affect file writes
  if (db && db.enabled) {
    try {
      await usageEventsDb.saveToDb(normalized.map((e) => ({ ...e, raw_source: 'server' })));
    } catch (err) {
      console.error('[db-usage-events-save-failed]', err);
    }
  }

  return normalized;
}

function usageEventDedupeKey(event) {
  return event.id || `${event.recordedAt}|${event.eventName}|${JSON.stringify(event.payload)}`;
}

function mergeUsageEvents(sources, limit) {
  const seen = new Set();
  return sources
    .flat()
    .map(normalizeUsageEvent)
    .filter(Boolean)
    .filter((event) => {
      const key = usageEventDedupeKey(event);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .slice(-limit);
}

async function readUsageEventsFromFile() {
  const text = await fs.promises.readFile(usageEventLogPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  if (!text.trim()) return [];
  return text.trim().split(/\r?\n/).flatMap((line) => {
    try {
      const event = normalizeUsageEvent(JSON.parse(line));
      if (!event) return [];
      return [event];
    } catch {
      return [];
    }
  });
}

async function readUsageEvents(limit = 5000) {
  const fileEvents = await readUsageEventsFromFile();
  if (!db || !db.enabled) return mergeUsageEvents([fileEvents], limit);

  try {
    const dbEvents = await usageEventsDb.getFromDb(limit);
    return mergeUsageEvents([fileEvents, dbEvents], limit);
  } catch (error) {
    console.error('[db-usage-events-read-failed]', error);
    return mergeUsageEvents([fileEvents], limit);
  }
}

fs.mkdirSync(logDir, { recursive: true });

app.use(express.json({ limit: '35mb' }));

// mount accounts routes (provides /api/auth/login, /api/accounts, /api/accounts/import)
try {
  const accountsRoutes = require('./routes/accounts');
  app.use('/api', accountsRoutes);
} catch (e) {
  console.error('Could not mount accounts routes', e);
}

app.post('/api/gemini', authRequired, geminiRateLimit, async (req, res) => {
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
    const safeData = upstream.ok ? data : redactSecret(data, geminiApiKey);

    if (!upstream.ok) {
      recordGeminiError(model, upstream.status, geminiErrorMessage(safeData?.error?.message, geminiApiKey));
    }
    return res.status(upstream.status).json(safeData);
  } catch (error) {
    const safeMessage = geminiErrorMessage(error?.message, geminiApiKey);
    recordGeminiError(model, 502, safeMessage);
    return res.status(502).json({ error: { message: safeMessage } });
  }
});

app.post('/api/usage-events', authRequired, async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [req.body?.event || req.body];
    const saved = await appendUsageEvents(events);
    return res.json({ saved: saved.length });
  } catch (error) {
    return res.status(500).json({ error: { message: 'Usage events could not be saved.' } });
  }
});

app.get('/api/usage-events', authRequired, adminRequired, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 5000, 1), 20000);
    const events = await readUsageEvents(limit);
    return res.json({ events });
  } catch (error) {
    return res.status(500).json({ error: { message: 'Usage events could not be read.' } });
  }
});

app.get('/api/gemini-errors', authRequired, adminRequired, async (_req, res) => {
  try {
    const text = await fs.promises.readFile(geminiErrorLogPath, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return '';
      throw error;
    });
    const errors = text.trim()
      ? text.trim().split(/\r?\n/).slice(-200).flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      }).reverse()
      : [];
    return res.json({ errors });
  } catch (error) {
    return res.status(500).json({ error: { message: 'Gemini error logs could not be read.' } });
  }
});

app.get(['/server.js', '/package.json', '/package-lock.json', '/.env.example'], (_req, res) => {
  res.sendStatus(404);
});
app.use(express.static(publicDir, { dotfiles: 'deny' }));

app.listen(port, '0.0.0.0', () => {
  console.log(`RE:WORK server listening on http://localhost:${port}`);
});
