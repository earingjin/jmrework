const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const connectionString = process.env.TEST_DATABASE_URL;
const acknowledged = process.env.ALLOW_POSTGRES_AUTH_TEST === 'isolated-test-database';

async function tokenIsCurrent(client, token, secret) {
  const payload = jwt.verify(token, secret);
  const result = await client.query('SELECT status, role, token_version FROM accounts WHERE id = $1', [payload.accountId]);
  const account = result.rows[0];
  return Boolean(account && account.status === 'active' && account.token_version === payload.tokenVersion);
}

test('PostgreSQL migration and session revocation use an isolated test schema', { skip: !connectionString }, async () => {
  assert.equal(acknowledged, true, 'Set ALLOW_POSTGRES_AUTH_TEST=isolated-test-database only for a disposable test database');
  assert.notEqual(connectionString, process.env.DATABASE_URL, 'TEST_DATABASE_URL must not be the configured DATABASE_URL');
  const client = new Client({ connectionString });
  const schema = `rework_auth_${crypto.randomBytes(8).toString('hex')}`;
  const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '011_add_account_token_version.sql'), 'utf8');
  const secret = crypto.randomBytes(32).toString('hex');
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`CREATE TABLE accounts (
      id uuid PRIMARY KEY,
      login_id text NOT NULL,
      password_hash text NOT NULL,
      name text,
      role text NOT NULL,
      status text NOT NULL DEFAULT 'active'
    )`);
    const id = crypto.randomUUID();
    const originalHash = await bcrypt.hash('original-password-123', 4);
    await client.query(
      'INSERT INTO accounts (id, login_id, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
      [id, ' Existing.User ', originalHash, 'Existing Name', '상담사']
    );
    await client.query(migration);
    await client.query(migration);
    const migrated = await client.query('SELECT id, login_id, password_hash, name, role, status, token_version FROM accounts WHERE id = $1', [id]);
    assert.deepEqual(migrated.rows[0], {
      id, login_id: ' Existing.User ', password_hash: originalHash, name: 'Existing Name', role: '상담사', status: 'active', token_version: 0
    });

    const oldToken = jwt.sign({ accountId: id, tokenVersion: 0 }, secret, { expiresIn: '1h' });
    assert.equal(await tokenIsCurrent(client, oldToken, secret), true);
    const changedHash = await bcrypt.hash('changed-password-123', 4);
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET password_hash = $1, token_version = token_version + 1 WHERE id = $2', [changedHash, id]);
    await client.query('COMMIT');
    assert.equal(await tokenIsCurrent(client, oldToken, secret), false);
    assert.equal(await bcrypt.compare('changed-password-123', (await client.query('SELECT password_hash FROM accounts WHERE id = $1', [id])).rows[0].password_hash), true);

    const passwordToken = jwt.sign({ accountId: id, tokenVersion: 1 }, secret, { expiresIn: '1h' });
    await client.query("UPDATE accounts SET status = 'inactive', token_version = token_version + 1 WHERE id = $1", [id]);
    assert.equal(await tokenIsCurrent(client, passwordToken, secret), false);

    await client.query("UPDATE accounts SET status = 'active' WHERE id = $1", [id]);
    const statusToken = jwt.sign({ accountId: id, tokenVersion: 2 }, secret, { expiresIn: '1h' });
    await client.query("UPDATE accounts SET role = '관리자', token_version = token_version + 1 WHERE id = $1", [id]);
    assert.equal(await tokenIsCurrent(client, statusToken, secret), false);

    await assert.rejects(() => client.query('UPDATE accounts SET token_version = -1 WHERE id = $1', [id]), /accounts_token_version_nonnegative/);
    const metadata = await client.query(`SELECT column_default, is_nullable FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'accounts' AND column_name = 'token_version'`, [schema]);
    assert.equal(metadata.rows[0].column_default, '0');
    assert.equal(metadata.rows[0].is_nullable, 'NO');
  } finally {
    await client.query('RESET search_path').catch(() => {});
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
    await client.end();
  }
});
