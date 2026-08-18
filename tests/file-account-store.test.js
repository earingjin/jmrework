const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';
const accountStore = require('../lib/accountStore');

let tempDir;
let accountPath;
let auditPath;

test.beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'rework-auth-'));
  accountPath = path.join(tempDir, 'accounts.json');
  auditPath = path.join(tempDir, 'password-audit.jsonl');
  accountStore.configureFileStoreForTests({ accountFilePath: accountPath, passwordAuditFilePath: auditPath });
});

test.afterEach(async () => {
  await fs.promises.rm(tempDir, { recursive: true, force: true });
});

async function seedTwoAccounts() {
  const first = await accountStore.createAccount({ loginId: 'First.User', password: 'first-password-123', name: 'First', role: '상담사' });
  const second = await accountStore.createAccount({ loginId: 'second.user', password: 'second-password-123', name: 'Second', role: '상담사' });
  return { first, second };
}

test('concurrent login recording and password change preserve both updates', async () => {
  const { first } = await seedTwoAccounts();
  await Promise.all([
    accountStore.recordLogin(first.id),
    accountStore.updateAccountPassword(first.id, 'changed-password-123')
  ]);
  const stored = await accountStore.findAccountById(first.id);
  assert.equal(stored.loginCount, 1);
  assert.equal(stored.tokenVersion, 1);
  assert.equal(await bcrypt.compare('changed-password-123', stored.password_hash), true);
});

test('concurrent changes to different accounts and password/status changes are preserved', async () => {
  const { first, second } = await seedTwoAccounts();
  await Promise.all([
    accountStore.updateAccount(first.id, { branch: 'A' }),
    accountStore.updateAccount(second.id, { branch: 'B' }),
    accountStore.updateAccountPassword(first.id, 'another-password-123'),
    accountStore.updateAccount(first.id, { status: 'inactive' })
  ]);
  const firstStored = await accountStore.findAccountById(first.id);
  const secondStored = await accountStore.findAccountById(second.id);
  assert.equal(firstStored.branch, 'A');
  assert.equal(firstStored.status, 'inactive');
  assert.equal(firstStored.tokenVersion, 2);
  assert.equal(await bcrypt.compare('another-password-123', firstStored.password_hash), true);
  assert.equal(secondStored.branch, 'B');
  const tempFiles = (await fs.promises.readdir(tempDir)).filter((name) => name.endsWith('.tmp'));
  assert.deepEqual(tempFiles, []);
});

test('audit failure reports partial audit failure while keeping password and token version', async () => {
  const { first } = await seedTwoAccounts();
  const invalidAuditPath = path.join(tempDir, 'audit-directory');
  await fs.promises.mkdir(invalidAuditPath);
  accountStore.configureFileStoreForTests({ accountFilePath: accountPath, passwordAuditFilePath: invalidAuditPath });
  const result = await accountStore.updateAccountPassword(first.id, 'audit-failure-password-123');
  const stored = await accountStore.findAccountById(first.id);
  assert.equal(result.passwordChanged, true);
  assert.equal(result.auditLogged, false);
  assert.ok(result.trackingId);
  assert.equal(stored.tokenVersion, 1);
  assert.equal(await bcrypt.compare('audit-failure-password-123', stored.password_hash), true);
});

test('a failed queued write does not block the following write', async () => {
  const invalidAccountPath = path.join(tempDir, 'accounts-directory');
  await fs.promises.mkdir(invalidAccountPath);
  accountStore.configureFileStoreForTests({ accountFilePath: invalidAccountPath, passwordAuditFilePath: auditPath });
  await assert.rejects(() => accountStore.createAccount({ loginId: 'fail', password: 'failure-password-123' }));
  accountStore.configureFileStoreForTests({ accountFilePath: accountPath, passwordAuditFilePath: auditPath });
  const account = await accountStore.createAccount({ loginId: 'next', password: 'next-password-123' });
  assert.equal(account.loginId, 'next');
});

test('file login IDs are case-insensitive and whitespace-normalized', async () => {
  await accountStore.createAccount({ loginId: ' Mixed.Case ', password: 'mixed-password-123' });
  assert.ok(await accountStore.findAccountByLogin('mixed.case'));
  await assert.rejects(() => accountStore.createAccount({ loginId: 'MIXED.CASE', password: 'duplicate-password-123' }), /already exists/);
});

test('saving an unchanged role or status does not revoke the session', async () => {
  const { first } = await seedTwoAccounts();
  const before = await accountStore.findAccountById(first.id);
  await accountStore.updateAccount(first.id, { role: before.role, status: before.status });
  const after = await accountStore.findAccountById(first.id);
  assert.equal(after.tokenVersion, before.tokenVersion);
});
