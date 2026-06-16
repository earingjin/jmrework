const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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

async function replaceCounselorAccounts(accounts) {
  if (!pool) throw new Error('DB not configured');
  if (!Array.isArray(accounts)) throw new Error('accounts must be an array');

  // normalize and validate incoming accounts
  const rows = [];
  let excludedCount = 0;
  for (const a of accounts) {
    const loginId = String(a.loginId || a.login_id || '').trim();
    const password = typeof a.password === 'string' ? a.password : (a.passwordPlain || a.initialPassword || '');
    const name = String(a.name || loginId || '').trim() || loginId;
    const branch = a.branch || a.branchName || null;
    if (!loginId || !password) {
      excludedCount += 1;
      continue;
    }
    rows.push({ loginId, password, name, branch });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // remove existing counselors but keep admins
    await client.query("DELETE FROM accounts WHERE role = $1", ['상담사']);

    if (rows.length) {
      // hash passwords
      const hashed = await Promise.all(rows.map(r => bcrypt.hash(r.password, 10)));
      const params = [];
      const values = rows.map((r, i) => {
        const idx = i * 6;
        const h = hashed[i];
        params.push(r.loginId);
        params.push(h);
        params.push(r.name);
        params.push('상담사');
        params.push(r.branch);
        params.push('excel');
        return `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6})`;
      });

      const insertSql = `INSERT INTO accounts (login_id,password_hash,name,role,branch,source) VALUES ${values.join(',')}`;
      await client.query(insertSql, params);
    }

    await client.query('COMMIT');
    return { importedCount: rows.length, excludedCount };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { init, query, insertUsageEvents, findAccountByLogin, listAccounts, replaceCounselorAccounts, enabled };

