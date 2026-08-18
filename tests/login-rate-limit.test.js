const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const express = require('express');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'rate-limit-test-secret-with-at-least-32-bytes';
process.env.LOGIN_RATE_LIMIT_IP_MAX = '4';
process.env.LOGIN_RATE_LIMIT_ID_MAX = '2';
process.env.LOGIN_RATE_LIMIT_COMBINATION_MAX = '100';
process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '5000';

const accountStore = require('../lib/accountStore');
const accountsRouter = require('../routes/accounts');
const { createRateLimit } = require('../lib/auth');

let server;
let baseUrl;
let validAccount;
const originals = {
  findAccountByLogin: accountStore.findAccountByLogin,
  findAccountById: accountStore.findAccountById,
  recordLogin: accountStore.recordLogin
};

test.before(async () => {
  validAccount = { id: 'valid-id', loginId: 'valid', name: 'Valid', role: '상담사', status: 'active', token_version: 0, password_hash: await bcrypt.hash('valid-password-123', 10) };
  accountStore.findAccountByLogin = async (loginId) => ['valid', 'valid-ip'].includes(String(loginId).trim().toLowerCase()) ? validAccount : null;
  accountStore.findAccountById = async (id) => id === validAccount.id ? validAccount : null;
  accountStore.recordLogin = async () => {};
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api', accountsRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  Object.assign(accountStore, originals);
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function attempt(ip, loginId, password = 'wrong-password') {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ loginId, password })
  });
}

test('IP bucket limits attempts across different login IDs', async () => {
  assert.equal((await attempt('10.0.0.1', 'one')).status, 401);
  assert.equal((await attempt('10.0.0.1', 'two')).status, 401);
  assert.equal((await attempt('10.0.0.1', 'three')).status, 401);
  assert.equal((await attempt('10.0.0.1', 'four')).status, 401);
  assert.equal((await attempt('10.0.0.1', 'five')).status, 429);
});

test('login ID bucket limits attempts across different IP addresses', async () => {
  assert.equal((await attempt('10.0.1.1', 'same-target')).status, 401);
  assert.equal((await attempt('10.0.1.2', ' SAME-TARGET ')).status, 401);
  assert.equal((await attempt('10.0.1.3', 'Same-Target')).status, 429);
});

test('successful login resets ID and combination buckets for that login', async () => {
  assert.equal((await attempt('10.0.2.1', 'valid')).status, 401);
  assert.equal((await attempt('10.0.2.1', 'valid', 'valid-password-123')).status, 200);
  assert.equal((await attempt('10.0.2.1', 'valid')).status, 401);
  assert.equal((await attempt('10.0.2.1', 'valid')).status, 401);
});

test('successful login does not reset the IP-only bucket', async () => {
  assert.equal((await attempt('10.0.3.1', 'valid-ip', 'valid-password-123')).status, 200);
  assert.equal((await attempt('10.0.3.1', 'ip-a')).status, 401);
  assert.equal((await attempt('10.0.3.1', 'ip-b')).status, 401);
  assert.equal((await attempt('10.0.3.1', 'ip-c')).status, 401);
  assert.equal((await attempt('10.0.3.1', 'ip-d')).status, 429);
});

function fakeResponse() {
  const response = new EventEmitter();
  response.statusCode = 200;
  response.headers = {};
  response.set = (key, value) => { response.headers[key] = value; };
  response.status = (status) => { response.statusCode = status; return response; };
  response.json = (body) => { response.body = body; response.emit('finish'); return response; };
  return response;
}

test('capacity exhaustion preserves existing live buckets and conservatively rejects new keys', () => {
  let key = '';
  const limiter = createRateLimit({ windowMs: 60000, max: 10, maxEntries: 2, message: 'limited', keyGenerator: () => key });
  const call = (nextKey) => {
    key = nextKey;
    const response = fakeResponse();
    let continued = false;
    limiter({ ip: '127.0.0.1', originalUrl: '/login' }, response, () => { continued = true; });
    return { response, continued };
  };
  assert.equal(call('first').continued, true);
  assert.equal(call('second').continued, true);
  assert.equal(call('third').response.statusCode, 429);
  assert.equal(call('first').continued, true);
});
