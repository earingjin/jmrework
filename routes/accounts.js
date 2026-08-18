const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const accountStore = require('../lib/accountStore');
const { adminRequired, authRequired, createRateLimit, normalizeRole } = require('../lib/auth');
const { validatePassword } = require('../lib/passwordPolicy');
const { normalizeLoginId } = require('../lib/loginId');

const router = express.Router();
const INVALID_PASSWORD_HASH = bcrypt.hashSync('invalid-login-password-placeholder', 10);
const loginWindowMs = Math.max(Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, 100);
function loginLimit(name, defaultMax, keyGenerator, resetOnSuccess) {
  return createRateLimit({
    windowMs: Math.max(Number(process.env[`LOGIN_RATE_LIMIT_${name}_WINDOW_MS`]) || loginWindowMs, 100),
    max: Math.max(Number(process.env[`LOGIN_RATE_LIMIT_${name}_MAX`]) || defaultMax, 1),
    message: 'Too many login attempts. Please try again later.',
    keyGenerator,
    maxEntries: Math.max(Number(process.env.LOGIN_RATE_LIMIT_MAX_ENTRIES) || 10000, 100),
    resetOnSuccess
  });
}
const loginIpRateLimit = loginLimit('IP', 200, (req) => `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`, false);
const loginIdRateLimit = loginLimit('ID', Number(process.env.LOGIN_RATE_LIMIT_MAX) || 20, (req) => `id:${normalizeLoginId(req.body?.loginId)}`, true);
const loginCombinationRateLimit = loginLimit('COMBINATION', Number(process.env.LOGIN_RATE_LIMIT_MAX) || 20, (req) => {
  const loginId = normalizeLoginId(req.body?.loginId);
  return `combination:${req.ip || req.socket?.remoteAddress || 'unknown'}:${loginId}`;
}, true);
function unauthorized(res, msg = 'unauthorized') { return res.status(401).json({ error: { message: msg } }); }

function logSafeFailure(code) {
  const trackingId = crypto.randomUUID();
  console.error(`[account-api-error] code=${code} trackingId=${trackingId}`);
  return trackingId;
}

function passwordAuditContext(req, overrides = {}) {
  return {
    actorAccountId: req.user?.accountId || null,
    action: overrides.action || 'password_changed',
    source: overrides.source || 'application',
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
    metadata: overrides.metadata || {}
  };
}

// GET /api/auth/me
router.get('/auth/me', authRequired, async (req, res) => {
  try {
    const account = req.user.account;
    return res.json({
      account: {
        id: account.id,
        loginId: account.login_id || account.loginId,
        name: account.name,
        role: account.role,
        roleKey: normalizeRole(account.role),
        branch: account.branch,
        status: account.status || 'active',
        created_at: account.created_at || account.createdAt || null,
        last_login_at: account.last_login_at || account.lastLoginAt || null,
        login_count: Number(account.login_count ?? account.loginCount) || 0
      }
    });
  } catch {
    logSafeFailure('AUTH_ME_FAILED');
    return res.status(500).json({ error: { message: 'Could not load current account' } });
  }
});

// POST /api/auth/login
router.post('/auth/login', loginIpRateLimit, loginIdRateLimit, loginCombinationRateLimit, async (req, res) => {
  const loginId = String(req.body?.loginId || '').trim();
  const password = req.body?.password;
  if (!loginId || !password) return unauthorized(res, 'Missing credentials');
  try {
    const account = await accountStore.findAccountByLogin(loginId);
    const match = await bcrypt.compare(String(password), account?.password_hash || account?.passwordHash || INVALID_PASSWORD_HASH);
    if (!account || !match || String(account.status || 'active').toLowerCase() !== 'active') {
      return unauthorized(res, 'Invalid credentials');
    }
    await accountStore.recordLogin(account.id);
    const tokenVersion = Number(account.token_version ?? account.tokenVersion ?? 0);
    const token = jwt.sign({ accountId: account.id, role: account.role, tokenVersion }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, account: { id: account.id, loginId: account.login_id || account.loginId, name: account.name, role: account.role, branch: account.branch } });
  } catch {
    logSafeFailure('AUTH_LOGIN_FAILED');
    return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Authentication service unavailable' } });
  }
});

// POST /api/auth/password - change current user's password
router.post('/auth/password', authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: { message: 'currentPassword and newPassword required' } });
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) return res.status(400).json({ error: { message: passwordValidation.message } });

  try {
    const account = await accountStore.findAccountById(req.user.accountId);
    if (!account) return unauthorized(res, 'Account not found');
    const match = await bcrypt.compare(String(currentPassword), account.password_hash || account.passwordHash || '');
    if (!match) return unauthorized(res, 'Invalid current password');

    const result = await accountStore.updateAccountPassword(
      account.id,
      String(newPassword),
      passwordAuditContext(req, { source: 'self_service' })
    );
    if (!result || result.passwordChanged === false) return res.status(404).json({ error: { message: 'Account not found' } });
    if (result.auditLogged === false) {
      return res.json({ success: true, warning: { code: 'PASSWORD_CHANGED_AUDIT_PENDING', trackingId: result.trackingId } });
    }
    return res.json({ success: true });
  } catch {
    logSafeFailure('AUTH_PASSWORD_FAILED');
    return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Authentication service unavailable' } });
  }
});

// GET /api/accounts - list accounts (admin usage)
router.get('/accounts', authRequired, adminRequired, async (req, res) => {
  try {
    const accounts = await accountStore.listAccounts();
    return res.json({ accounts });
  } catch {
    logSafeFailure('ACCOUNTS_LIST_FAILED');
    return res.status(500).json({ error: { message: 'Could not list accounts' } });
  }
});

// POST /api/accounts/import
router.post('/accounts/import', authRequired, adminRequired, async (req, res) => {
  try {
    const payload = req.body || {};
    const accounts = Array.isArray(payload.accounts) ? payload.accounts : (Array.isArray(payload) ? payload : []);
    if (!accounts.length) return res.status(400).json({ error: { message: 'No accounts provided' } });

    const result = await accountStore.replaceCounselorAccounts(accounts);
    const savedAccounts = await accountStore.listAccounts();
    return res.json({ success: true, importedCount: result.importedCount, excludedCount: result.excludedCount, totalRows: accounts.length, accounts: savedAccounts });
  } catch {
    logSafeFailure('ACCOUNTS_IMPORT_FAILED');
    return res.status(500).json({ error: { message: 'Could not import accounts' } });
  }
});

// POST /api/accounts - create account (admin)
router.post('/accounts', authRequired, adminRequired, async (req, res) => {
  try {
    const body = req.body || {};
    const account = await accountStore.createAccount(body);
    return res.status(201).json({ account });
  } catch {
    logSafeFailure('ACCOUNT_CREATE_FAILED');
    return res.status(500).json({ error: { message: 'Could not create account' } });
  }
});

// PUT /api/accounts/:id - update account
router.put('/accounts/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await accountStore.updateAccount(id, body);
    if (!updated) return res.status(404).json({ error: { message: 'Account not found or nothing to update' } });
    return res.json({ account: updated });
  } catch {
    logSafeFailure('ACCOUNT_UPDATE_FAILED');
    return res.status(500).json({ error: { message: 'Could not update account' } });
  }
});

// DELETE /api/accounts/:id - delete account
router.delete('/accounts/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const id = req.params.id;
    await accountStore.deleteAccount(id);
    return res.json({ success: true });
  } catch {
    logSafeFailure('ACCOUNT_DELETE_FAILED');
    return res.status(500).json({ error: { message: 'Could not delete account' } });
  }
});

// POST /api/accounts/:id/password - change password
router.post('/accounts/:id/password', authRequired, adminRequired, async (req, res) => {
  try {
    const id = req.params.id;
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: { message: 'password required' } });
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) return res.status(400).json({ error: { message: passwordValidation.message } });
    const result = await accountStore.updateAccountPassword(
      id,
      password,
      passwordAuditContext(req, {
        action: 'password_reset',
        source: 'admin_api'
      })
    );
    if (!result || result.passwordChanged === false) return res.status(404).json({ error: { message: 'Account not found' } });
    if (result.auditLogged === false) {
      return res.json({ success: true, warning: { code: 'PASSWORD_CHANGED_AUDIT_PENDING', trackingId: result.trackingId } });
    }
    return res.json({ success: true });
  } catch {
    logSafeFailure('ACCOUNT_PASSWORD_FAILED');
    return res.status(500).json({ error: { message: 'Password change failed' } });
  }
});

module.exports = router;
