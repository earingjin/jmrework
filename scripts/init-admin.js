require('dotenv').config();

const accountStore = require('../lib/accountStore');
const db = require('../lib/db');
const { normalizeRole } = require('../lib/auth');
const { validatePassword } = require('../lib/passwordPolicy');

async function main() {
  const loginId = String(process.env.ADMIN_LOGIN_ID || '').trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!loginId || !password) {
    throw new Error('ADMIN_LOGIN_ID and ADMIN_INITIAL_PASSWORD are required');
  }

  const validation = validatePassword(password);
  if (!validation.valid) throw new Error(validation.message);

  db.init();
  try {
    const existing = await accountStore.findAccountByLogin(loginId);
    if (existing) {
      const kind = normalizeRole(existing.role) === 'admin' ? 'administrator' : 'non-administrator';
      throw new Error(`Account already exists as ${kind}; no changes were made`);
    }

    const account = await accountStore.createAccount({
      loginId,
      password,
      name: loginId,
      role: '관리자',
      status: 'active',
      source: 'explicit-admin-init'
    });

    console.log(`Administrator account created: ${account.loginId || account.login_id}`);
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(`[init-admin-error] ${error.message}`);
  process.exitCode = 1;
});
