const path = require('path');
const fs = require('fs');
const vm = require('vm');
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
const promptFileCache = new Map();
let successCaseFileCache = null;

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

function loadPromptWindow(fileName) {
  const safeName = path.basename(fileName);
  if (promptFileCache.has(safeName)) return promptFileCache.get(safeName);
  const filePath = path.join(__dirname, 'prompts', safeName);
  const window = {};
  const context = vm.createContext({ window, console });
  const source = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(source, context, { filename: filePath });
  promptFileCache.set(safeName, window);
  return window;
}

function loadSuccessCaseRows() {
  if (successCaseFileCache) return successCaseFileCache;
  const filePath = path.join(__dirname, 'data', 'successData.js');
  const source = fs.readFileSync(filePath, 'utf8');
  successCaseFileCache = vm.runInNewContext(`${source}\nSUCCESS_CASE_DB;`, {}, { filename: filePath });
  return Array.isArray(successCaseFileCache) ? successCaseFileCache : [];
}

function successCaseIdFromItem(item) {
  const row = item?.case || item || {};
  return String(item?.id || row['사례ID'] || row.caseId || row.case_id || '').trim();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function successRawDataForPrompt(rawData) {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return {};
  const blocked = /(사례자|성명|이름|person\s*name|case\s*id|사례\s*id|사례ID|상담활용문장|상담\s*활용\s*문장)/i;
  return Object.fromEntries(
    Object.entries(rawData)
      .filter(([key, value]) => key && !blocked.test(String(key)) && value !== undefined && value !== null && String(value).trim() !== '')
      .map(([key, value]) => [key, String(value).slice(0, 3000)])
  );
}

function successPromptRowWithRawData(row, rawData) {
  const rawPromptData = successRawDataForPrompt(rawData);
  const promptRow = {
    ...rawPromptData,
    '출처기관': row.source_org || '',
    '출처연도': row.source_year || '',
    '사례자명': row.person_name || '',
    '데이터 일련번호': row.serial_no || '',
    '현재직업': row.current_job || '',
    '이전경력': row.previous_career || '',
    '보유자격교육': row.cert_training || '',
    '준비방법': row.preparation || '',
    '주요활동': row.activities || '',
    '전환유형': row.transition_type || '',
    '추천대상': row.recommended_target || '',
    '핵심키워드': row.keywords || '',
    '성공요인': row.success_factors || '',
    '상담활용문장': row.counseling_sentence || '',
    '공개가능여부': row.public_status || '',
    '원본시트': row.source_sheet || '',
    '원본번호': row.source_no || '',
    '출처문구': row.source_text || ''
  };
  if (Object.keys(rawPromptData).length) promptRow['원본추가정보'] = rawPromptData;
  return promptRow;
}

async function dbSuccessCaseForPrompt(id) {
  if (!db || !db.enabled || !isUuid(id)) return null;
  const result = await db.query(
    `SELECT id,source_org,source_year,person_name,serial_no,current_job,previous_career,cert_training,preparation,activities,transition_type,recommended_target,keywords,success_factors,counseling_sentence,public_status,source_sheet,source_no,source_text,status,raw_data
     FROM success_cases
     WHERE id = $1 AND status = 'active'
     LIMIT 1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return successPromptRowWithRawData(row, row.raw_data);
}

async function enrichSuccessCaseForPrompt(item) {
  const row = item?.case || item || {};
  const id = successCaseIdFromItem(item);
  if (!id) return row;
  const dbRow = await dbSuccessCaseForPrompt(id);
  if (dbRow) return dbRow;
  return loadSuccessCaseRows().find((caseRow) => String(caseRow?.['사례ID'] || '').trim() === id) || row;
}

async function enrichSuccessCasesForPrompt(items = []) {
  const stats = { total: items.length, dbHit: 0, localHit: 0, requestOnly: 0, invalidId: 0, dbError: 0 };
  const rows = await Promise.all(items.map(async (item) => {
    const row = item?.case || item || {};
    const id = successCaseIdFromItem(item);
    if (!id) {
      stats.invalidId += 1;
      return row;
    }
    if (isUuid(id) && db?.enabled) {
      try {
        const dbRow = await dbSuccessCaseForPrompt(id);
        if (dbRow) {
          stats.dbHit += 1;
          return dbRow;
        }
      } catch (error) {
        stats.dbError += 1;
        console.warn('[success-report-enrichment-db-error]', { id, message: error?.message || String(error) });
      }
    }
    const localRow = loadSuccessCaseRows().find((caseRow) => String(caseRow?.['사례ID'] || '').trim() === id);
    if (localRow) {
      stats.localHit += 1;
      return localRow;
    }
    stats.requestOnly += 1;
    return row;
  }));
  console.info('[success-report-enrichment]', stats);
  return rows;
}

function getServerGeminiModel(scope = 'default', requestedModel = '') {
  return requestedModel || process.env[`${String(scope).toUpperCase()}_GEMINI_MODEL`] || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

function noTargetInterestSchemaForRepair() {
  return {
    participantInfo: 'object',
    integratedAnalysis: {
      strengthDirection: 'string',
      cautionEnvironment: 'string',
      explorationCriteria: 'string'
    },
    swot: {
      strengths: 'string[]',
      weaknesses: 'string[]',
      opportunities: 'string[]',
      threats: 'string[]'
    },
    recommendedJobs: [{ title: 'string', reason: 'string', relatedStrength: 'string', preparation: 'string' }],
    interestSummary: { shapeAnalysis: 'string', counselorReferenceType: 'string' },
    personalitySummary: 'string',
    lifeHistorySummary: 'string',
    aiLifeQuestions: [{ question: 'string', intent: 'string', counselorUse: 'string' }]
  };
}

function targetInterestSchemaForRepair() {
  return {
    participantInfo: 'object',
    targetJobCompetencyAnalysis: {
      fitSummary: 'string',
      matchingPoints: 'string[]',
      gaps: 'string[]'
    },
    swot: {
      strengths: 'string[]',
      weaknesses: 'string[]',
      opportunities: 'string[]',
      threats: 'string[]'
    },
    recommendedJobs: [{ title: 'string', reason: 'string', relatedStrength: 'string', preparation: 'string' }],
    demographicOutlook: 'string',
    digitalTransformationOutlook: 'string',
    finalStrategy: {
      jobInfoExploration: 'string[]',
      competencyPreparation: 'string[]',
      applicationReview: 'string[]'
    },
    coachingQuestions: 'string[]'
  };
}

function successPromptCase(row) {
  const copy = { ...(row || {}) };
  delete copy['사례자명'];
  delete copy['사례자명원본'];
  delete copy.personName;
  delete copy.person_name;
  delete copy['사례ID'];
  delete copy.caseId;
  delete copy.case_id;
  delete copy['상담활용문장'];
  delete copy.counselingSentence;
  delete copy.counseling_sentence;
  return copy;
}

async function buildReportGeminiRequest(body = {}) {
  const reportType = String(body.reportType || '').trim();
  const variant = String(body.variant || '').trim();
  const requestedModel = typeof body.model === 'string' ? body.model.trim() : '';

  if (reportType === 'interest') {
    const promptWindow = variant === 'target'
      ? loadPromptWindow('geminiPromptTarget.js')
      : loadPromptWindow('geminiPromptNoTarget.js');
    const prompt = variant === 'target'
      ? promptWindow.GEMINI_TARGET_INTEREST_PROMPT
      : promptWindow.GEMINI_NO_TARGET_INTEREST_PROMPT;
    if (!prompt?.system || !prompt?.user) throw new Error('Interest prompt is not available.');
    return {
      model: getServerGeminiModel('interest', requestedModel),
      payload: {
        system_instruction: { parts: [{ text: prompt.system() }] },
        contents: [{ role: 'user', parts: [{ text: prompt.user(body.input || {}) }] }],
        generationConfig: { temperature: 0.12, topP: 0.65, responseMimeType: 'application/json' }
      },
      schema: variant === 'target' ? targetInterestSchemaForRepair() : noTargetInterestSchemaForRepair(),
      context: variant === 'target' ? '직업선호도검사 희망직무 있음' : '직업선호도검사 희망직무 없음'
    };
  }

  if (reportType === 'success') {
    const promptWindow = loadPromptWindow('successPrompt.js');
    const prompts = promptWindow.SUCCESS_PROMPTS;
    if (!prompts?.system || !prompts?.user) throw new Error('Success prompt is not available.');
    const useSearch = body.useSearch !== false;
    const generationConfig = { temperature: 0.2, topP: 0.8 };
    if (!useSearch) generationConfig.responseMimeType = 'application/json';
    const selectedCases = await enrichSuccessCasesForPrompt(Array.isArray(body.matchedCases) ? body.matchedCases : []);
    const payload = {
      system_instruction: { parts: [{ text: prompts.system() }] },
      contents: [{
        role: 'user',
        parts: [{
          text: prompts.user({
            keyword: body.keyword || '',
            participant: body.participant || {},
            counselorInsight: body.insight || '',
            selectedCases: selectedCases.map((item) => successPromptCase(item))
          })
        }]
      }],
      generationConfig
    };
    if (useSearch) payload.tools = [{ google_search: {} }];
    return {
      model: getServerGeminiModel('success', requestedModel),
      payload,
      schema: promptWindow.SUCCESS_ANALYSIS_SCHEMA || {},
      context: '성공사례 리포트'
    };
  }

  throw new Error('Unsupported report type.');
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

// mount notices routes (provides /api/notices for counselors and admin notice management)
try {
  const noticesRoutes = require('./routes/notices');
  app.use('/api', noticesRoutes);
} catch (e) {
  console.error('Could not mount notices routes', e);
}

// mount success case routes (provides /api/success-cases search and admin import)
try {
  const successCaseRoutes = require('./routes/successCases');
  app.use('/api', successCaseRoutes);
} catch (e) {
  console.error('Could not mount success case routes', e);
}

// mount community routes (provides /api/community-posts for authenticated users)
try {
  const communityPostRoutes = require('./routes/communityPosts');
  app.use('/api', communityPostRoutes);
} catch (e) {
  console.error('Could not mount community routes', e);
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

app.post('/api/report-gemini', authRequired, geminiRateLimit, async (req, res) => {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    return res.status(500).json({ error: { message: 'Gemini API key is not configured on the server.' } });
  }

  let reportRequest;
  try {
    reportRequest = await buildReportGeminiRequest(req.body || {});
  } catch (error) {
    return res.status(400).json({ error: { message: error?.message || 'Report Gemini request is invalid.' } });
  }

  const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(reportRequest.model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportRequest.payload)
    });
    const data = await upstream.json().catch(() => ({
      error: { message: `Gemini returned an invalid JSON response (${upstream.status}).` }
    }));
    const safeData = upstream.ok ? data : redactSecret(data, geminiApiKey);

    if (!upstream.ok) {
      recordGeminiError(reportRequest.model, upstream.status, geminiErrorMessage(safeData?.error?.message, geminiApiKey));
    }
    res.set('X-Gemini-Model', reportRequest.model);
    return res.status(upstream.status).json(safeData);
  } catch (error) {
    const safeMessage = geminiErrorMessage(error?.message, geminiApiKey);
    recordGeminiError(reportRequest.model, 502, safeMessage);
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

app.use('/prompts', (_req, res) => {
  res.sendStatus(404);
});

app.use(['/lib', '/routes', '/logs', '/migrations', '/scripts', '/docs'], (_req, res) => {
  res.sendStatus(404);
});

app.get(['/server.js', '/package.json', '/package-lock.json', '/.env.example', '/aiGateway.js', '/data/successData.js', '/data/successUiData.js'], (_req, res) => {
  res.sendStatus(404);
});
app.use(express.static(publicDir, { dotfiles: 'deny' }));

app.listen(port, '0.0.0.0', () => {
  console.log(`RE:WORK server listening on http://localhost:${port}`);
});
