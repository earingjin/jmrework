const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { normalizeRole } = require('./auth');
const { normalizeLoginId } = require('./loginId');

if (process.env.NODE_ENV === 'production' && !db.enabled) {
  throw new Error('DATABASE_URL is required in production; the file account store is development/test only.');
}

let accountFilePath = path.join(__dirname, '..', 'logs', 'accounts.json');
let passwordAuditFilePath = path.join(__dirname, '..', 'logs', 'account-password-audit.jsonl');
let fileWriteQueue = Promise.resolve();

function withFileWriteLock(operation) {
  const run = fileWriteQueue.then(operation, operation);
  fileWriteQueue = run.catch(() => {});
  return run;
}

function toPublicAccount(account) {
  if (!account) return null;
  const loginId = account.login_id || account.loginId || '';
  return {
    id: account.id,
    login_id: loginId,
    loginId,
    name: account.name || loginId,
    role: account.role,
    branch: account.branch || null,
    status: account.status || 'active',
    created_at: account.created_at || account.createdAt || null,
    createdAt: account.createdAt || account.created_at || null,
    last_login_at: account.last_login_at || account.lastLoginAt || null,
    lastLoginAt: account.lastLoginAt || account.last_login_at || null,
    login_count: Number(account.login_count ?? account.loginCount) || 0,
    loginCount: Number(account.loginCount ?? account.login_count) || 0
  };
}

async function ensureFileStore() {
  await fs.promises.mkdir(path.dirname(accountFilePath), { recursive: true });
  try {
    await fs.promises.writeFile(accountFilePath, '{"accounts":[]}\n', { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

async function readFileData() {
  await ensureFileStore();
  return readFileDataUnlocked();
}

async function readFileDataUnlocked() {
  const text = await fs.promises.readFile(accountFilePath, 'utf8');
  const data = JSON.parse(text || '{"accounts":[]}');
  return { accounts: Array.isArray(data.accounts) ? data.accounts : [] };
}

async function writeFileData(data) {
  await fs.promises.mkdir(path.dirname(accountFilePath), { recursive: true });
  const tmpPath = `${accountFilePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.promises.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await fs.promises.rename(tmpPath, accountFilePath);
  } catch (error) {
    await fs.promises.rm(tmpPath, { force: true }).catch(() => {});
    throw error;
  }
}

function normalizeFileAccount(input, existing = {}) {
  const loginId = String(input.loginId || input.login_id || existing.loginId || existing.login_id || '').trim();
  const now = new Date().toISOString();
  return {
    ...existing,
    id: existing.id || input.id || crypto.randomUUID(),
    loginId,
    name: String(input.name || existing.name || loginId).trim() || loginId,
    role: input.role || existing.role || '상담사',
    branch: input.branch ?? input.branchName ?? existing.branch ?? null,
    status: input.status || existing.status || 'active',
    tokenVersion: Number(input.tokenVersion ?? input.token_version ?? existing.tokenVersion ?? existing.token_version ?? 0),
    source: input.source || existing.source || 'admin',
    createdAt: existing.createdAt || existing.created_at || input.createdAt || now,
    lastLoginAt: existing.lastLoginAt || existing.last_login_at || null,
    loginCount: Number(existing.loginCount ?? existing.login_count) || 0
  };
}

async function findAccountByLogin(loginId) {
  if (db.enabled) return db.findAccountByLogin(loginId);
  const data = await readFileData();
  const normalized = normalizeLoginId(loginId);
  const account = data.accounts.find((item) => normalizeLoginId(item.loginId) === normalized) || null;
  return account ? normalizeFileAccount(account, account) : null;
}

async function findAccountById(id) {
  if (db.enabled) return db.findAccountById(id);
  const data = await readFileData();
  const account = data.accounts.find((item) => String(item.id) === String(id)) || null;
  return account ? normalizeFileAccount(account, account) : null;
}

async function listAccounts() {
  if (db.enabled) return (await db.listAccounts()).map(toPublicAccount);
  const data = await readFileData();
  return data.accounts
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .map(toPublicAccount);
}

async function recordLogin(id) {
  if (db.enabled) {
    await db.query('UPDATE accounts SET login_count = login_count + 1, last_login_at = now() WHERE id = $1', [id]);
    return;
  }
  return withFileWriteLock(async () => {
    await ensureFileStore();
    const data = await readFileDataUnlocked();
    const account = data.accounts.find((item) => item.id === id);
    if (!account) return;
    account.loginCount = (Number(account.loginCount) || 0) + 1;
    account.lastLoginAt = new Date().toISOString();
    await writeFileData(data);
  });
}

async function replaceCounselorAccounts(accounts) {
  if (db.enabled) return db.replaceCounselorAccounts(accounts);
  if (!Array.isArray(accounts)) throw new Error('accounts must be an array');
  return withFileWriteLock(async () => {
    await ensureFileStore();
    const data = await readFileDataUnlocked();
    const admins = data.accounts.filter((account) => normalizeRole(account.role) === 'admin');
    const reservedLoginIds = new Set(admins.map((account) => normalizeLoginId(account.loginId)));
    const next = [];
    let excludedCount = 0;
    const seen = new Set();

    for (const item of accounts) {
      const loginId = String(item.loginId || item.login_id || '').trim();
      const normalizedLoginId = normalizeLoginId(loginId);
      const password = String(item.password || item.passwordPlain || item.initialPassword || '');
      if (!loginId || !password || seen.has(normalizedLoginId) || reservedLoginIds.has(normalizedLoginId)) {
        excludedCount += 1;
        continue;
      }
      seen.add(normalizedLoginId);
      const account = normalizeFileAccount({ ...item, loginId, role: '상담사', source: 'excel' });
      account.password_hash = await bcrypt.hash(password, 10);
      next.push(account);
    }

    await writeFileData({ accounts: [...admins, ...next] });
    return { importedCount: next.length, excludedCount };
  });
}

async function createAccount(account) {
  if (db.enabled) return db.createAccount(account);
  const loginId = String(account.loginId || account.login_id || '').trim();
  const password = String(account.password || account.passwordPlain || '');
  if (!loginId || !password) throw new Error('loginId and password required');

  return withFileWriteLock(async () => {
    await ensureFileStore();
    const data = await readFileDataUnlocked();
    if (data.accounts.some((item) => normalizeLoginId(item.loginId) === normalizeLoginId(loginId))) {
      throw new Error('loginId already exists');
    }

    const row = normalizeFileAccount({ ...account, loginId });
    row.password_hash = await bcrypt.hash(password, 10);
    data.accounts.push(row);
    await writeFileData(data);
    return toPublicAccount(row);
  });
}

async function updateAccount(id, fields) {
  if (db.enabled) return db.updateAccount(id, fields);
  return withFileWriteLock(async () => {
    await ensureFileStore();
    const data = await readFileDataUnlocked();
    const index = data.accounts.findIndex((account) => account.id === id);
    if (index < 0) return null;

    const existing = data.accounts[index];
    const next = normalizeFileAccount(fields, existing);
    const roleChanged = fields.role !== undefined && String(fields.role) !== String(existing.role);
    const statusChanged = fields.status !== undefined && String(fields.status) !== String(existing.status || 'active');
    if (fields.password) {
      next.password_hash = await bcrypt.hash(String(fields.password), 10);
      next.tokenVersion = Number(existing.tokenVersion ?? existing.token_version ?? 0) + 1;
    } else next.password_hash = existing.password_hash;
    if (!fields.password && (roleChanged || statusChanged)) {
      next.tokenVersion = Number(existing.tokenVersion ?? existing.token_version ?? 0) + 1;
    }

    data.accounts[index] = next;
    await writeFileData(data);
    return toPublicAccount(next);
  });
}

async function deleteAccount(id) {
  if (db.enabled) return db.deleteAccount(id);
  return withFileWriteLock(async () => {
    await ensureFileStore();
    const data = await readFileDataUnlocked();
    const account = data.accounts.find((item) => item.id === id);
    if (!account) return false;
    if (normalizeRole(account.role) === 'admin') throw new Error('Cannot delete admin account');
    data.accounts = data.accounts.filter((item) => item.id !== id);
    await writeFileData(data);
    return true;
  });
}

async function updateAccountPassword(id, newPassword, audit = {}) {
  if (db.enabled) return db.updateAccountPassword(id, newPassword, audit);
  return withFileWriteLock(async () => {
    await ensureFileStore();
    const data = await readFileDataUnlocked();
    const account = data.accounts.find((item) => String(item.id) === String(id));
    if (!account) return { passwordChanged: false, auditLogged: false };
    account.password_hash = await bcrypt.hash(String(newPassword), 10);
    account.tokenVersion = Number(account.tokenVersion ?? account.token_version ?? 0) + 1;
    delete account.token_version;
    await writeFileData(data);

    const trackingId = crypto.randomUUID();
    const entry = {
      id: trackingId,
      targetAccountId: id,
      actorAccountId: audit.actorAccountId || null,
      action: audit.action || 'password_changed',
      source: audit.source || 'application',
      ipAddress: audit.ipAddress || null,
      userAgent: audit.userAgent ? String(audit.userAgent).slice(0, 500) : null,
      changedAt: new Date().toISOString(),
      metadata: audit.metadata || {}
    };
    try {
      await fs.promises.mkdir(path.dirname(passwordAuditFilePath), { recursive: true });
      await fs.promises.appendFile(passwordAuditFilePath, `${JSON.stringify(entry)}\n`, 'utf8');
      return { passwordChanged: true, auditLogged: true, trackingId };
    } catch {
      console.error(`[security-audit-write-failed] code=PASSWORD_AUDIT_WRITE_FAILED trackingId=${trackingId}`);
      return { passwordChanged: true, auditLogged: false, trackingId };
    }
  });
}

function configureFileStoreForTests(paths = {}) {
  if (process.env.NODE_ENV !== 'test') throw new Error('File store test configuration is only available in NODE_ENV=test');
  if (paths.accountFilePath) accountFilePath = path.resolve(paths.accountFilePath);
  if (paths.passwordAuditFilePath) passwordAuditFilePath = path.resolve(paths.passwordAuditFilePath);
  fileWriteQueue = Promise.resolve();
}

module.exports = {
  accountFilePath,
  passwordAuditFilePath,
  findAccountByLogin,
  findAccountById,
  listAccounts,
  recordLogin,
  replaceCounselorAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  updateAccountPassword,
  toPublicAccount,
  configureFileStoreForTests
};
