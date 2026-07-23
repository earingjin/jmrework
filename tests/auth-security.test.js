const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-jwt-secret-with-at-least-32-bytes';

const accountStore = require('../lib/accountStore');
const accountsRouter = require('../routes/accounts');

const originalStore = {};
for (const key of ['findAccountByLogin', 'findAccountById', 'recordLogin', 'listAccounts', 'updateAccountPassword']) {
  originalStore[key] = accountStore[key];
}

let server;
let baseUrl;

test.before(async () => {
  const adminHash = await bcrypt.hash('existing-admin-password', 4);
  const counselorHash = await bcrypt.hash('existing-user-password', 4);
  const accounts = {
    admin: { id: 'admin-id', loginId: 'admin', name: '관리자', role: '관리자', status: 'active', password_hash: adminHash },
    counselor: { id: 'counselor-id', loginId: 'counselor', name: '상담사', role: '상담사', status: 'active', password_hash: counselorHash }
  };

  accountStore.findAccountByLogin = async (loginId) => accounts[loginId] || null;
  accountStore.findAccountById = async (id) => Object.values(accounts).find((account) => account.id === id) || null;
  accountStore.recordLogin = async () => {};
  accountStore.listAccounts = async () => Object.values(accounts).map(({ password_hash, ...account }) => account);
  accountStore.updateAccountPassword = async () => true;

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

function bearer(accountId, role) {
  return `Bearer ${jwt.sign({ accountId, role }, process.env.JWT_SECRET, { expiresIn: '5m' })}`;
}

test('existing administrator and counselor logins keep the normal response shape', async () => {
  for (const credentials of [
    { loginId: 'admin', password: 'existing-admin-password' },
    { loginId: 'counselor', password: 'existing-user-password' }
  ]) {
    const result = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    assert.equal(result.status, 200);
    assert.ok(result.body.token);
    assert.ok(result.body.account);
    const serialized = JSON.stringify(result.body);
    assert.doesNotMatch(serialized, /"password(?:_hash)?":/);
    assert.equal(serialized.includes('DATABASE_URL'), false);
    assert.equal(serialized.includes('JWT_SECRET'), false);
  }
});

test('non-administrator token receives 403 from administrator API', async () => {
  const result = await request('/api/accounts', {
    headers: { authorization: bearer('counselor-id', '상담사') }
  });
  assert.equal(result.status, 403);
});

test('self-service and administrator reset both reject passwords shorter than 12 characters', async () => {
  const selfService = await request('/api/auth/password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: bearer('admin-id', '관리자') },
    body: JSON.stringify({ currentPassword: 'existing-admin-password', newPassword: 'short' })
  });
  assert.equal(selfService.status, 400);

  const adminReset = await request('/api/accounts/counselor-id/password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: bearer('admin-id', '관리자') },
    body: JSON.stringify({ password: 'short' })
  });
  assert.equal(adminReset.status, 400);
});

test('file account store initializes empty and has no automatic administrator factory', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'accountStore.js'), 'utf8');
  assert.equal(source.includes('defaultAdminAccount'), false);
  assert.equal(source.includes('ensureInitialAdmin'), false);
  assert.match(source, /writeFileData\(\{ accounts: \[\] \}\)/);
});
