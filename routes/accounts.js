const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const accountStore = require('../lib/accountStore');
const { adminRequired, authRequired, createRateLimit, normalizeRole } = require('../lib/auth');

const router = express.Router();
const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts. Please try again later.'
});

function unauthorized(res, msg = 'unauthorized') { return res.status(401).json({ error: { message: msg } }); }

// GET /api/auth/me
router.get('/auth/me', authRequired, async (req, res) => {
  try {
    const account = await accountStore.findAccountById(req.user.accountId);
    if (!account) return unauthorized(res, 'Account not found');
    if (account.status === 'inactive') return unauthorized(res, 'Inactive account');
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
  } catch (err) {
    console.error('[auth-me-error]', err);
    return res.status(500).json({ error: { message: 'Could not load current account' } });
  }
});

// POST /api/auth/login
router.post('/auth/login', loginRateLimit, async (req, res) => {
  const { loginId, password } = req.body || {};
  if (!loginId || !password) return unauthorized(res, 'Missing credentials');
  try {
    const account = await accountStore.findAccountByLogin(loginId);
    if (!account) return unauthorized(res, 'Invalid credentials');
    const match = await bcrypt.compare(password, account.password_hash || account.passwordHash || '');
    if (!match) return unauthorized(res, 'Invalid credentials');
    if (account.status === 'inactive') return unauthorized(res, 'Inactive account');
    await accountStore.recordLogin(account.id);
    const token = jwt.sign({ accountId: account.id, role: account.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, account: { id: account.id, loginId: account.login_id || account.loginId, name: account.name, role: account.role, branch: account.branch } });
  } catch (err) {
    console.error('[auth-login-error]', err);
    return res.status(500).json({ error: { message: 'Login failed' } });
  }
});

// POST /api/auth/password - change current user's password
router.post('/auth/password', authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: { message: 'currentPassword and newPassword required' } });
  if (String(newPassword).length < 4) return res.status(400).json({ error: { message: 'newPassword must be at least 4 characters' } });

  try {
    const account = await accountStore.findAccountById(req.user.accountId);
    if (!account) return unauthorized(res, 'Account not found');
    const match = await bcrypt.compare(String(currentPassword), account.password_hash || account.passwordHash || '');
    if (!match) return unauthorized(res, 'Invalid current password');

    const ok = await accountStore.updateAccountPassword(account.id, String(newPassword));
    if (!ok) return res.status(404).json({ error: { message: 'Account not found' } });
    return res.json({ success: true });
  } catch (err) {
    console.error('[auth-password-error]', err);
    return res.status(500).json({ error: { message: 'Password change failed' } });
  }
});

// GET /api/accounts - list accounts (admin usage)
router.get('/accounts', authRequired, adminRequired, async (req, res) => {
  try {
    const accounts = await accountStore.listAccounts();
    return res.json({ accounts });
  } catch (err) {
    console.error('[accounts-list-error]', err);
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
  } catch (err) {
    console.error('[accounts-import-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

// POST /api/accounts - create account (admin)
router.post('/accounts', authRequired, adminRequired, async (req, res) => {
  try {
    const body = req.body || {};
    const account = await accountStore.createAccount(body);
    return res.status(201).json({ account });
  } catch (err) {
    console.error('[accounts-create-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
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
  } catch (err) {
    console.error('[accounts-update-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

// DELETE /api/accounts/:id - delete account
router.delete('/accounts/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const id = req.params.id;
    await accountStore.deleteAccount(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('[accounts-delete-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

// POST /api/accounts/:id/password - change password
router.post('/accounts/:id/password', authRequired, adminRequired, async (req, res) => {
  try {
    const id = req.params.id;
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: { message: 'password required' } });
    const ok = await accountStore.updateAccountPassword(id, password);
    if (!ok) return res.status(404).json({ error: { message: 'Account not found' } });
    return res.json({ success: true });
  } catch (err) {
    console.error('[accounts-password-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

module.exports = router;
