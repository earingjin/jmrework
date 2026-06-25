const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { normalizeRole } = require('./auth');

const accountFilePath = path.join(__dirname, '..', 'logs', 'accounts.json');

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
  const exists = await fs.promises.access(accountFilePath).then(() => true).catch(() => false);
  if (exists) return;
  await writeFileData({ accounts: [await defaultAdminAccount()] });
}

async function defaultAdminAccount() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  return {
    id: crypto.randomUUID(),
    loginId: 'admin',
    password_hash: passwordHash,
    name: '관리자',
    role: '관리자',
    branch: null,
    status: 'active',
    source: 'file-default',
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    loginCount: 0
  };
}

async function ensureInitialAdmin(data) {
  if (data.accounts.some((account) => normalizeRole(account.role) === 'admin')) return data;

  const next = { accounts: [await defaultAdminAccount(), ...data.accounts] };
  await writeFileData(next);
  return next;
}

async function readFileData() {
  await ensureFileStore();
  const text = await fs.promises.readFile(accountFilePath, 'utf8');
  const data = JSON.parse(text || '{"accounts":[]}');
  return ensureInitialAdmin({ accounts: Array.isArray(data.accounts) ? data.accounts : [] });
}

async function writeFileData(data) {
  await fs.promises.mkdir(path.dirname(accountFilePath), { recursive: true });
  const tmpPath = `${accountFilePath}.tmp`;
  await fs.promises.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.promises.rename(tmpPath, accountFilePath);
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
    source: input.source || existing.source || 'admin',
    createdAt: existing.createdAt || existing.created_at || input.createdAt || now,
    lastLoginAt: existing.lastLoginAt || existing.last_login_at || null,
    loginCount: Number(existing.loginCount ?? existing.login_count) || 0
  };
}

async function findAccountByLogin(loginId) {
  if (db.enabled) return db.findAccountByLogin(loginId);
  const data = await readFileData();
  const normalized = String(loginId || '').trim().toLowerCase();
  return data.accounts.find((account) => String(account.loginId || '').trim().toLowerCase() === normalized) || null;
}

async function findAccountById(id) {
  if (db.enabled) return db.findAccountById(id);
  const data = await readFileData();
  return data.accounts.find((account) => String(account.id) === String(id)) || null;
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
  const data = await readFileData();
  const account = data.accounts.find((item) => item.id === id);
  if (!account) return;
  account.loginCount = (Number(account.loginCount) || 0) + 1;
  account.lastLoginAt = new Date().toISOString();
  await writeFileData(data);
}

async function replaceCounselorAccounts(accounts) {
  if (db.enabled) return db.replaceCounselorAccounts(accounts);
  if (!Array.isArray(accounts)) throw new Error('accounts must be an array');

  const data = await readFileData();
  const admins = data.accounts.filter((account) => normalizeRole(account.role) === 'admin');
  const next = [];
  let excludedCount = 0;
  const seen = new Set();

  for (const item of accounts) {
    const loginId = String(item.loginId || item.login_id || '').trim();
    const password = String(item.password || item.passwordPlain || item.initialPassword || '');
    if (!loginId || !password || seen.has(loginId.toLowerCase())) {
      excludedCount += 1;
      continue;
    }
    seen.add(loginId.toLowerCase());
    const account = normalizeFileAccount({ ...item, loginId, role: '상담사', source: 'excel' });
    account.password_hash = await bcrypt.hash(password, 10);
    next.push(account);
  }

  await writeFileData({ accounts: [...admins, ...next] });
  return { importedCount: next.length, excludedCount };
}

async function createAccount(account) {
  if (db.enabled) return db.createAccount(account);
  const loginId = String(account.loginId || account.login_id || '').trim();
  const password = String(account.password || account.passwordPlain || '');
  if (!loginId || !password) throw new Error('loginId and password required');

  const data = await readFileData();
  if (data.accounts.some((item) => String(item.loginId || '').trim().toLowerCase() === loginId.toLowerCase())) {
    throw new Error('loginId already exists');
  }

  const row = normalizeFileAccount({ ...account, loginId });
  row.password_hash = await bcrypt.hash(password, 10);
  data.accounts.push(row);
  await writeFileData(data);
  return toPublicAccount(row);
}

async function updateAccount(id, fields) {
  if (db.enabled) return db.updateAccount(id, fields);
  const data = await readFileData();
  const index = data.accounts.findIndex((account) => account.id === id);
  if (index < 0) return null;

  const existing = data.accounts[index];
  const next = normalizeFileAccount(fields, existing);
  if (fields.password) next.password_hash = await bcrypt.hash(String(fields.password), 10);
  else next.password_hash = existing.password_hash;

  data.accounts[index] = next;
  await writeFileData(data);
  return toPublicAccount(next);
}

async function deleteAccount(id) {
  if (db.enabled) return db.deleteAccount(id);
  const data = await readFileData();
  const account = data.accounts.find((item) => item.id === id);
  if (!account) return false;
  if (normalizeRole(account.role) === 'admin') throw new Error('Cannot delete admin account');
  data.accounts = data.accounts.filter((item) => item.id !== id);
  await writeFileData(data);
  return true;
}

async function updateAccountPassword(id, newPassword) {
  if (db.enabled) return db.updateAccountPassword(id, newPassword);
  return Boolean(await updateAccount(id, { password: newPassword }));
}

module.exports = {
  accountFilePath,
  findAccountByLogin,
  findAccountById,
  listAccounts,
  recordLogin,
  replaceCounselorAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  updateAccountPassword,
  toPublicAccount
};
