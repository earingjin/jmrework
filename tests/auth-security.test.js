const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-jwt-secret-with-at-least-32-bytes';
process.env.LOGIN_RATE_LIMIT_MAX = '5';
process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '1000';

const accountStore = require('../lib/accountStore');
const accountsRouter = require('../routes/accounts');

const storeMethods = [
  'findAccountByLogin',
  'findAccountById',
  'recordLogin',
  'listAccounts',
  'replaceCounselorAccounts',
  'createAccount',
  'updateAccount',
  'deleteAccount',
  'updateAccountPassword'
];
const originalStore = Object.fromEntries(storeMethods.map((key) => [key, accountStore[key]]));

let server;
let baseUrl;
let accounts;

function publicAccount(account) {
  const { password_hash, token_version, ...safe } = account;
  return { ...safe };
}

function currentVersion(account) {
  return Number(account.token_version ?? account.tokenVersion ?? 0);
}

async function setPassword(account, password) {
  account.password_hash = await bcrypt.hash(password, 4);
  account.token_version = currentVersion(account) + 1;
}

test.before(async () => {
  accounts = {
    admin: {
      id: 'admin-id', loginId: 'admin', name: '관리자', role: '관리자', status: 'active',
      token_version: 0, password_hash: await bcrypt.hash('existing-admin-password', 4)
    },
    counselor: {
      id: 'counselor-id', loginId: 'counselor', name: '상담사', role: '상담사', status: 'active',
      token_version: 0, password_hash: await bcrypt.hash('existing-user-password', 4)
    },
    inactive: {
      id: 'inactive-id', loginId: 'inactive', name: '비활성', role: '상담사', status: 'inactive',
      token_version: 0, password_hash: await bcrypt.hash('inactive-user-password', 4)
    }
  };

  accountStore.findAccountByLogin = async (loginId) =>
    Object.values(accounts).find((account) => account.loginId.toLowerCase() === String(loginId).trim().toLowerCase()) || null;
  accountStore.findAccountById = async (id) =>
    Object.values(accounts).find((account) => account.id === id) || null;
  accountStore.recordLogin = async (id) => {
    const account = Object.values(accounts).find((item) => item.id === id);
    if (account) account.loginCount = (account.loginCount || 0) + 1;
  };
  accountStore.listAccounts = async () => Object.values(accounts).map(publicAccount);
  accountStore.updateAccountPassword = async (id, password) => {
    const account = Object.values(accounts).find((item) => item.id === id);
    if (!account) return false;
    await setPassword(account, password);
    return true;
  };
  accountStore.updateAccount = async (id, fields) => {
    const account = Object.values(accounts).find((item) => item.id === id);
    if (!account) return null;
    const invalidate =
      (fields.status !== undefined && fields.status !== account.status) ||
      (fields.role !== undefined && fields.role !== account.role) ||
      fields.password !== undefined;
    Object.assign(account, fields);
    if (fields.password) account.password_hash = await bcrypt.hash(String(fields.password), 4);
    if (invalidate) account.token_version = currentVersion(account) + 1;
    return publicAccount(account);
  };
  accountStore.deleteAccount = async (id) => {
    const entry = Object.entries(accounts).find(([, account]) => account.id === id);
    if (!entry) return false;
    delete accounts[entry[0]];
    return true;
  };

  const app = express();
  app.use(express.json());
  app.use('/api', accountsRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  for (const [key, value] of Object.entries(originalStore)) accountStore[key] = value;
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(url, options = {}) {
  const response = await fetch(`${baseUrl}${url}`, options);
  return { status: response.status, body: await response.json() };
}

function tokenFor(account, overrides = {}, options = { expiresIn: '5m' }) {
  return jwt.sign({
    accountId: account.id,
    role: account.role,
    tokenVersion: currentVersion(account),
    ...overrides
  }, process.env.JWT_SECRET, options);
}

function authorization(token) {
  return { authorization: `Bearer ${token}` };
}

async function login(loginId, password) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ loginId, password })
  });
}

test('normal counselor login succeeds and returns no secrets', async () => {
  const result = await login('counselor', 'existing-user-password');
  assert.equal(result.status, 200);
  assert.ok(result.body.token);
  assert.equal(result.body.account.role, '상담사');
  const serialized = JSON.stringify(result.body);
  assert.doesNotMatch(serialized, /password(?:_hash|Hash)?/i);
  assert.doesNotMatch(serialized, /DATABASE_URL|JWT_SECRET|GEMINI_API_KEY/);
});

test('normal administrator login succeeds', async () => {
  const result = await login('admin', 'existing-admin-password');
  assert.equal(result.status, 200);
  assert.ok(result.body.token);
  assert.equal(result.body.account.role, '관리자');
});

test('wrong password login fails with the generic response', async () => {
  const result = await login('wrong-password-user', 'wrong-password');
  assert.equal(result.status, 401);
  assert.equal(result.body.error.message, 'Invalid credentials');
});

test('tampered JWT is rejected', async () => {
  const token = `${tokenFor(accounts.counselor).slice(0, -1)}x`;
  const result = await request('/api/auth/me', { headers: authorization(token) });
  assert.equal(result.status, 401);
});

test('expired JWT is rejected', async () => {
  const token = tokenFor(accounts.counselor, {}, { expiresIn: -1 });
  const result = await request('/api/auth/me', { headers: authorization(token) });
  assert.equal(result.status, 401);
});

test('legacy JWT without a session version is rejected', async () => {
  const token = jwt.sign({ accountId: accounts.counselor.id, role: accounts.counselor.role }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const result = await request('/api/auth/me', { headers: authorization(token) });
  assert.equal(result.status, 401);
  assert.equal(result.body.error.code, 'TOKEN_REVOKED');
});

test('JWT for a missing account is rejected', async () => {
  const token = jwt.sign({ accountId: 'missing-id', role: '상담사', tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const result = await request('/api/auth/me', { headers: authorization(token) });
  assert.equal(result.status, 401);
});

test('JWT for an inactive account is rejected', async () => {
  const result = await request('/api/auth/me', { headers: authorization(tokenFor(accounts.inactive)) });
  assert.equal(result.status, 401);
});

test('counselor receives 403 from an administrator API', async () => {
  const result = await request('/api/accounts', { headers: authorization(tokenFor(accounts.counselor)) });
  assert.equal(result.status, 403);
});

test('self-service password change revokes the old JWT and a new login works', async () => {
  const oldToken = tokenFor(accounts.counselor);
  const changed = await request('/api/auth/password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authorization(oldToken) },
    body: JSON.stringify({ currentPassword: 'existing-user-password', newPassword: 'new-user-password-123' })
  });
  assert.equal(changed.status, 200);
  assert.equal((await request('/api/auth/me', { headers: authorization(oldToken) })).status, 401);
  assert.equal((await login('counselor', 'new-user-password-123')).status, 200);
});

test('administrator password reset revokes the target JWT', async () => {
  const targetToken = tokenFor(accounts.counselor);
  const adminToken = tokenFor(accounts.admin);
  const reset = await request(`/api/accounts/${accounts.counselor.id}/password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authorization(adminToken) },
    body: JSON.stringify({ password: 'reset-user-password-123' })
  });
  assert.equal(reset.status, 200);
  assert.equal((await request('/api/auth/me', { headers: authorization(targetToken) })).status, 401);
  assert.equal((await login('counselor', 'reset-user-password-123')).status, 200);
});

test('deactivation revokes the old JWT', async () => {
  const targetToken = tokenFor(accounts.counselor);
  const adminToken = tokenFor(accounts.admin);
  const updated = await request(`/api/accounts/${accounts.counselor.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...authorization(adminToken) },
    body: JSON.stringify({ status: 'inactive' })
  });
  assert.equal(updated.status, 200);
  assert.equal((await request('/api/auth/me', { headers: authorization(targetToken) })).status, 401);
  accounts.counselor.status = 'active';
  accounts.counselor.token_version += 1;
});

test('role change revokes the old JWT and a newly issued JWT works', async () => {
  const oldToken = tokenFor(accounts.counselor);
  const adminToken = tokenFor(accounts.admin);
  const updated = await request(`/api/accounts/${accounts.counselor.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...authorization(adminToken) },
    body: JSON.stringify({ role: '관리자' })
  });
  assert.equal(updated.status, 200);
  assert.equal((await request('/api/auth/me', { headers: authorization(oldToken) })).status, 401);
  const fresh = await login('counselor', 'reset-user-password-123');
  assert.equal(fresh.status, 200);
  assert.equal((await request('/api/auth/me', { headers: authorization(fresh.body.token) })).status, 200);
  accounts.counselor.role = '상담사';
  accounts.counselor.token_version += 1;
});

test('password policy remains enforced for self-service and administrator reset', async () => {
  const adminToken = tokenFor(accounts.admin);
  const selfService = await request('/api/auth/password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authorization(adminToken) },
    body: JSON.stringify({ currentPassword: 'existing-admin-password', newPassword: 'short' })
  });
  assert.equal(selfService.status, 400);

  const adminReset = await request(`/api/accounts/${accounts.counselor.id}/password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authorization(adminToken) },
    body: JSON.stringify({ password: 'short' })
  });
  assert.equal(adminReset.status, 400);
});

test('repeated login attempts are limited and work again after the window', async () => {
  for (let index = 0; index < 5; index += 1) {
    const result = await login('rate-limit-target', 'wrong-password');
    assert.equal(result.status, 401);
  }
  assert.equal((await login('rate-limit-target', 'wrong-password')).status, 429);
  await new Promise((resolve) => setTimeout(resolve, 1050));
  assert.equal((await login('rate-limit-target', 'wrong-password')).status, 401);
});

test('account-store outage returns 503 without exposing internal error details', async () => {
  const originalFind = accountStore.findAccountById;
  const originalError = console.error;
  const logs = [];
  accountStore.findAccountById = async () => {
    throw new Error('password=secret DATABASE_URL=postgres://private internal SQL SELECT * FROM accounts');
  };
  console.error = (...args) => logs.push(args.join(' '));
  try {
    const response = await request('/api/auth/me', { headers: authorization(tokenFor(accounts.admin)) });
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'AUTH_SERVICE_UNAVAILABLE');
    const exposed = `${JSON.stringify(response.body)} ${logs.join(' ')}`;
    assert.doesNotMatch(exposed, /password=secret|postgres:\/\/private|SELECT \* FROM accounts/);
    assert.match(logs.join(' '), /trackingId=/);
  } finally {
    accountStore.findAccountById = originalFind;
    console.error = originalError;
  }
});

test('login store outage returns a safe 503 response and safe log', async () => {
  const originalFind = accountStore.findAccountByLogin;
  const originalError = console.error;
  const logs = [];
  accountStore.findAccountByLogin = async () => {
    throw new Error('DATABASE_URL=postgres://private password=secret SELECT password_hash');
  };
  console.error = (...args) => logs.push(args.join(' '));
  try {
    const response = await login('store-outage-user', 'any-password');
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, 'AUTH_SERVICE_UNAVAILABLE');
    const exposed = `${JSON.stringify(response.body)} ${logs.join(' ')}`;
    assert.doesNotMatch(exposed, /postgres:\/\/private|password=secret|SELECT password_hash/);
  } finally {
    accountStore.findAccountByLogin = originalFind;
    console.error = originalError;
  }
});

test('file account store source has no automatic administrator factory and supports token versions', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'accountStore.js'), 'utf8');
  assert.equal(source.includes('defaultAdminAccount'), false);
  assert.equal(source.includes('ensureInitialAdmin'), false);
  assert.match(source, /flag: 'wx'/);
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.match(source, /tokenVersion/);
});

test('client restoration requires auth-me and clears sensitive caches on failure', () => {
  const appCore = fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'appCore.js'), 'utf8');
  const adminLogin = fs.readFileSync(path.join(__dirname, '..', 'admin', 'js', 'pages', 'login.js'), 'utf8');
  const adminApp = fs.readFileSync(path.join(__dirname, '..', 'admin', 'js', 'app.js'), 'utf8');
  const accountView = fs.readFileSync(path.join(__dirname, '..', 'js', 'views', 'accountView.js'), 'utf8');
  assert.doesNotMatch(appCore, /restoreCachedAuthenticatedUser|accountFromStoredToken/);
  assert.match(appCore, /clearAuthenticatedSession/);
  assert.match(appCore, /resetSensitiveSessionData\(\)/);
  assert.match(adminLogin, /clearAdminAuthentication/);
  assert.match(adminApp, /if \(!restored\)/);
  assert.match(accountView, /logout\(\)/);
});
