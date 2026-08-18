const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { normalizeLoginId } = require('./loginId');

let pool = null;
const enabled = Boolean(process.env.DATABASE_URL);

function init() {
  if (!enabled) return;
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  pool.on('error', (err) => {
    console.error('Postgres pool error', err);
  });
}

async function close() {
  if (!pool) return;
  const currentPool = pool;
  pool = null;
  await currentPool.end();
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
  const res = await pool.query('SELECT id,login_id,password_hash,name,role,branch,status,token_version,created_at,last_login_at,login_count FROM accounts WHERE lower(btrim(login_id)) = $1', [normalizeLoginId(loginId)]);
  return res.rows[0] || null;
}

async function findAccountById(id) {
  if (!pool) throw new Error('DB not configured');
  const res = await pool.query('SELECT id,login_id,password_hash,name,role,branch,status,token_version,created_at,last_login_at,login_count FROM accounts WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function listAccounts() {
  if (!pool) throw new Error('DB not configured');
  const res = await pool.query('SELECT id,login_id,name,role,branch,status,token_version,created_at,last_login_at,login_count FROM accounts ORDER BY created_at DESC');
  return res.rows || [];
}

async function replaceCounselorAccounts(accounts) {
  if (!pool) throw new Error('DB not configured');
  if (!Array.isArray(accounts)) throw new Error('accounts must be an array');

  // normalize and validate incoming accounts
  const adminLoginResult = await pool.query("SELECT lower(btrim(login_id)) AS normalized_login_id FROM accounts WHERE lower(role) IN ('관리자','admin','administrator')");
  const reservedLoginIds = new Set(adminLoginResult.rows.map((row) => row.normalized_login_id));
  const seenLoginIds = new Set();
  const rows = [];
  let excludedCount = 0;
  for (const a of accounts) {
    const loginId = String(a.loginId || a.login_id || '').trim();
    const password = typeof a.password === 'string' ? a.password : (a.passwordPlain || a.initialPassword || '');
    const name = String(a.name || loginId || '').trim() || loginId;
    const branch = a.branch || a.branchName || null;
    const normalizedLoginId = normalizeLoginId(loginId);
    if (!loginId || !password || seenLoginIds.has(normalizedLoginId) || reservedLoginIds.has(normalizedLoginId)) {
      excludedCount += 1;
      continue;
    }
    seenLoginIds.add(normalizedLoginId);
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

async function createAccount(account) {
  if (!pool) throw new Error('DB not configured');
  const loginId = String(account.loginId || account.login_id || '').trim();
  const password = String(account.password || account.passwordPlain || '');
  const name = String(account.name || loginId || '').trim() || loginId;
  const role = account.role || '상담사';
  const branch = account.branch || null;
  if (!loginId || !password) throw new Error('loginId and password required');
  const duplicate = await pool.query('SELECT 1 FROM accounts WHERE lower(btrim(login_id)) = $1 LIMIT 1', [normalizeLoginId(loginId)]);
  if (duplicate.rowCount) throw new Error('loginId already exists');
  const hash = await bcrypt.hash(password, 10);
  const res = await pool.query('INSERT INTO accounts (login_id,password_hash,name,role,branch,source) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,login_id,name,role,branch,status,token_version,created_at,last_login_at,login_count', [loginId, hash, name, role, branch, account.source || 'admin']);
  return res.rows[0];
}

async function updateAccount(id, fields) {
  if (!pool) throw new Error('DB not configured');
  const client = await pool.connect();
  const set = [];
  const params = [];
  let idx = 1;
  try {
    await client.query('BEGIN');
    const existingResult = await client.query('SELECT role,status FROM accounts WHERE id = $1 FOR UPDATE', [id]);
    const existing = existingResult.rows[0];
    if (!existing) {
      await client.query('ROLLBACK');
      return null;
    }
    if (fields.loginId || fields.login_id) {
      const normalizedLoginId = normalizeLoginId(fields.loginId || fields.login_id);
      const duplicate = await client.query('SELECT 1 FROM accounts WHERE lower(btrim(login_id)) = $1 AND id <> $2 LIMIT 1', [normalizedLoginId, id]);
      if (duplicate.rowCount) throw new Error('loginId already exists');
      set.push(`login_id = $${idx++}`);
      params.push(String(fields.loginId || fields.login_id).trim());
    }
    if (fields.name) { set.push(`name = $${idx++}`); params.push(String(fields.name)); }
    if (fields.branch) { set.push(`branch = $${idx++}`); params.push(String(fields.branch)); }
    let invalidateSessions = false;
    if (fields.status) {
      const status = String(fields.status);
      set.push(`status = $${idx++}`);
      params.push(status);
      if (status !== String(existing.status)) invalidateSessions = true;
    }
    if (fields.role) {
      const role = String(fields.role);
      set.push(`role = $${idx++}`);
      params.push(role);
      if (role !== String(existing.role)) invalidateSessions = true;
    }
    if (fields.password) {
      const hash = await bcrypt.hash(String(fields.password), 10);
      set.push(`password_hash = $${idx++}`);
      params.push(hash);
      invalidateSessions = true;
    }
    if (invalidateSessions) set.push('token_version = token_version + 1');
    if (!set.length) {
      await client.query('ROLLBACK');
      return null;
    }
    params.push(id);
    const sql = `UPDATE accounts SET ${set.join(', ')} WHERE id = $${idx} RETURNING id,login_id,name,role,branch,status,token_version,created_at,last_login_at,login_count`;
    const res = await client.query(sql, params);
    await client.query('COMMIT');
    return res.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function deleteAccount(id) {
  if (!pool) throw new Error('DB not configured');
  // prevent accidental admin deletion
  const existing = await pool.query('SELECT id,role FROM accounts WHERE id = $1', [id]);
  const row = existing.rows[0];
  if (!row) return false;
  if (row.role === '관리자') throw new Error('Cannot delete 관리자 account');
  await pool.query('DELETE FROM accounts WHERE id = $1', [id]);
  return true;
}

async function updateAccountPassword(id, newPassword, audit = {}) {
  if (!pool) throw new Error('DB not configured');
  if (!newPassword) throw new Error('password required');
  const hash = await bcrypt.hash(String(newPassword), 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      'UPDATE accounts SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING id',
      [hash, id]
    );
    if (res.rowCount !== 1) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query(
      `INSERT INTO account_password_audit_logs
        (target_account_id, actor_account_id, action, source, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5::inet, $6, $7::jsonb)`,
      [
        id,
        audit.actorAccountId || null,
        audit.action || 'password_changed',
        audit.source || 'application',
        audit.ipAddress || null,
        audit.userAgent ? String(audit.userAgent).slice(0, 500) : null,
        JSON.stringify(audit.metadata || {})
      ]
    );
    await client.query('COMMIT');
    return { passwordChanged: true, auditLogged: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { init, close, query, insertUsageEvents, findAccountByLogin, findAccountById, listAccounts, replaceCounselorAccounts, createAccount, updateAccount, deleteAccount, updateAccountPassword, enabled };

