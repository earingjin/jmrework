const test = require('node:test');
const assert = require('node:assert/strict');
const { createController } = require('../js/core/authSession');

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key)
  };
}

test('simultaneous protected API 401 responses clear sensitive state only once', async () => {
  const storage = memoryStorage({ token: 'jwt', account: 'cached', location: 'report', legacy: 'participant' });
  let resets = 0;
  let notices = 0;
  const screen = { view: 'report', participant: { name: '민감정보' }, generatedReport: '민감한 리포트' };
  const controller = createController({
    storage,
    sensitiveKeys: ['token', 'account', 'location', 'legacy'],
    fetchImpl: async () => new Response(JSON.stringify({ error: { code: 'TOKEN_REVOKED' } }), { status: 401 }),
    resetSensitiveState: () => {
      resets += 1;
      screen.participant = null;
      screen.generatedReport = null;
    },
    onUnauthorized: () => {
      notices += 1;
      screen.view = 'login';
    }
  });
  await Promise.all([
    controller.authenticatedFetch('/api/notices'),
    controller.authenticatedFetch('/api/community-posts'),
    controller.authenticatedFetch('/api/report-gemini'),
    controller.authenticatedFetch('/api/accounts')
  ]);
  assert.equal(resets, 1);
  assert.equal(notices, 1);
  assert.deepEqual(screen, { view: 'login', participant: null, generatedReport: null });
  for (const key of ['token', 'account', 'location', 'legacy']) assert.equal(storage.has(key), false);
});

test('403 reports permission failure without clearing authentication', async () => {
  const storage = memoryStorage({ token: 'jwt' });
  let forbidden = 0;
  const controller = createController({
    storage,
    sensitiveKeys: ['token'],
    fetchImpl: async () => new Response('{}', { status: 403 }),
    onForbidden: () => { forbidden += 1; }
  });
  await controller.authenticatedFetch('/api/admin-only');
  assert.equal(forbidden, 1);
  assert.equal(storage.has('token'), true);
});

test('503 and network errors do not clear the token', async () => {
  const storage = memoryStorage({ token: 'jwt' });
  let serviceErrors = 0;
  let networkErrors = 0;
  const serviceController = createController({
    storage,
    sensitiveKeys: ['token'],
    fetchImpl: async () => new Response('{}', { status: 503 }),
    onServiceError: () => { serviceErrors += 1; }
  });
  await serviceController.authenticatedFetch('/api/accounts');
  const networkController = createController({
    storage,
    sensitiveKeys: ['token'],
    fetchImpl: async () => { throw new TypeError('network unavailable'); },
    onNetworkError: () => { networkErrors += 1; }
  });
  await assert.rejects(() => networkController.authenticatedFetch('/api/accounts'));
  assert.equal(serviceErrors, 1);
  assert.equal(networkErrors, 1);
  assert.equal(storage.has('token'), true);
});

test('a successful new login can reset the one-shot invalidation guard', async () => {
  const storage = memoryStorage({ token: 'old' });
  let resets = 0;
  const controller = createController({ storage, sensitiveKeys: ['token'], resetSensitiveState: () => { resets += 1; } });
  await controller.handleResponse(new Response('{}', { status: 401 }));
  storage.setItem('token', 'new');
  controller.resetInvalidation();
  await controller.handleResponse(new Response('{}', { status: 401 }));
  assert.equal(resets, 2);
});
