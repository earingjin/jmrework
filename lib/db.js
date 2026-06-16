const { Pool } = require('pg');

let pool = null;
const enabled = Boolean(process.env.DATABASE_URL);

function init() {
  if (!enabled) return;
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  pool.on('error', (err) => {
    console.error('Postgres pool error', err);
  });
}

async function query(text, params) {
  if (!pool) throw new Error('DB not configured');
  return pool.query(text, params);
}

async function insertUsageEvents(events) {
  if (!pool) throw new Error('DB not configured');
  if (!Array.isArray(events) || events.length === 0) return 0;
  const values = [];
  const params = [];
  // We'll insert without specifying the internal uuid id so Postgres generates gen_random_uuid()
  // Store client-provided id into client_event_id (text) and preserve it inside payload.clientEventId
  events.forEach((ev, i) => {
    const idx = i * 7;
    const clientEventId = ev.id || ev.client_event_id || ev.clientEventId || null;
    const eventName = ev.eventName || null;
    const payloadObj = Object.assign({}, ev.payload || {});
    if (clientEventId && !payloadObj.clientEventId && !payloadObj.client_event_id) payloadObj.clientEventId = clientEventId;
    const payloadJson = JSON.stringify(payloadObj);
    const recordedAt = ev.recordedAt || null;
    const counselorIdRaw = ev.payload?.counselorId || ev.counselorId || null;
    const rawSource = ev.raw_source || ev.rawSource || null;

    // detect if counselorIdRaw is a UUID; if so store into counselor_id (uuid FK),
    // otherwise store original value into client_counselor_id (text) and leave counselor_id NULL
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const counselorId = (typeof counselorIdRaw === 'string' && uuidRegex.test(counselorIdRaw)) ? counselorIdRaw : null;
    const clientCounselorId = (typeof counselorIdRaw === 'string' && !uuidRegex.test(counselorIdRaw)) ? counselorIdRaw : null;

    params.push(clientEventId);
    params.push(eventName);
    params.push(payloadJson);
    params.push(recordedAt);
    params.push(counselorId);
    params.push(clientCounselorId);
    params.push(rawSource);

    values.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}::jsonb, $${idx + 4}::timestamptz, $${idx + 5}::uuid, $${idx + 6}, $${idx + 7})`);
  });

  const text = `INSERT INTO usage_events (client_event_id,event_name,payload,recorded_at,counselor_id,client_counselor_id,raw_source) VALUES ${values.join(",")} ON CONFLICT (client_event_id) DO NOTHING`;
  const res = await pool.query(text, params);
  return res.rowCount || 0;
}

async function findAccountByLogin(loginId) {
  if (!pool) throw new Error('DB not configured');
  const res = await pool.query('SELECT id,login_id,password_hash,name,role,branch,status,created_at,last_login_at,login_count FROM accounts WHERE login_id = $1', [String(loginId).trim()]);
  return res.rows[0] || null;
}

async function listAccounts() {
  if (!pool) throw new Error('DB not configured');
  const res = await pool.query('SELECT id,login_id,name,role,branch,status,created_at,last_login_at,login_count FROM accounts ORDER BY created_at DESC');
  return res.rows || [];
}

module.exports = { init, query, insertUsageEvents, findAccountByLogin, listAccounts, enabled };
