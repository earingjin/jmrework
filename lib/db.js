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
  events.forEach((ev, i) => {
    const idx = i * 6;
    params.push(ev.id || null);
    params.push(ev.eventName || null);
    params.push(JSON.stringify(ev.payload || {}));
    params.push(ev.recordedAt || null);
    params.push(ev.payload?.counselorId || null);
    params.push(ev.raw_source || null);
    values.push(`($${idx + 1}::uuid,$${idx + 2},$${idx + 3}::jsonb,$${idx + 4}::timestamptz,$${idx + 5}::uuid,$${idx + 6})`);
  });

  const text = `INSERT INTO usage_events (id,event_name,payload,recorded_at,counselor_id,raw_source) VALUES ${values.join(",")} ON CONFLICT (id) DO NOTHING`;
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
