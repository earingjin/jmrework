const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTrustProxy, validateProductionStorage } = require('../lib/runtimeConfig');

test('TRUST_PROXY accepts only documented safe forms', () => {
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy('false'), false);
  assert.equal(parseTrustProxy('0'), false);
  assert.equal(parseTrustProxy('1'), 1);
  assert.equal(parseTrustProxy('5'), 5);
  assert.equal(parseTrustProxy('127.0.0.1'), '127.0.0.1');
  assert.equal(parseTrustProxy('10.0.0.0/8'), '10.0.0.0/8');
  assert.deepEqual(parseTrustProxy('loopback, 10.0.0.0/8'), ['loopback', '10.0.0.0/8']);
});

test('TRUST_PROXY rejects true, unsafe hops, empty tokens and arbitrary values', () => {
  for (const value of ['true', '-1', '6', 'anything', 'loopback,', '999.1.1.1', '10.0.0.0/99']) {
    assert.throws(() => parseTrustProxy(value));
  }
});

test('production requires DATABASE_URL while development file mode remains available', () => {
  assert.throws(() => validateProductionStorage({ NODE_ENV: 'production', DATABASE_URL: '' }), /DATABASE_URL/);
  assert.doesNotThrow(() => validateProductionStorage({ NODE_ENV: 'production', DATABASE_URL: 'postgres://configured' }));
  assert.doesNotThrow(() => validateProductionStorage({ NODE_ENV: 'development', DATABASE_URL: '' }));
});
