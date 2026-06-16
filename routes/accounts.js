const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../lib/db');

const router = express.Router();

function unauthorized(res, msg = 'unauthorized') { return res.status(401).json({ error: { message: msg } }); }

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  if (!db || !db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
  const { loginId, password } = req.body || {};
  if (!loginId || !password) return unauthorized(res, 'Missing credentials');
  try {
    const account = await db.findAccountByLogin(loginId);
    if (!account) return unauthorized(res, 'Invalid credentials');
    const match = await bcrypt.compare(password, account.password_hash || account.passwordHash || '');
    if (!match) return unauthorized(res, 'Invalid credentials');
    // update login_count and last_login_at
    await db.query('UPDATE accounts SET login_count = login_count + 1, last_login_at = now() WHERE id = $1', [account.id]);
    const token = jwt.sign({ accountId: account.id, role: account.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });
    return res.json({ token, account: { id: account.id, loginId: account.login_id, name: account.name, role: account.role, branch: account.branch } });
  } catch (err) {
    console.error('[auth-login-error]', err);
    return res.status(500).json({ error: { message: 'Login failed' } });
  }
});

// GET /api/accounts - list accounts (admin usage)
router.get('/accounts', async (req, res) => {
  if (!db || !db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
  try {
    const accounts = await db.listAccounts();
    return res.json({ accounts });
  } catch (err) {
    console.error('[accounts-list-error]', err);
    return res.status(500).json({ error: { message: 'Could not list accounts' } });
  }
});

// POST /api/accounts/import
router.post('/accounts/import', async (req, res) => {
  if (!db || !db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
  try {
    const payload = req.body || {};
    const accounts = Array.isArray(payload.accounts) ? payload.accounts : (Array.isArray(payload) ? payload : []);
    if (!accounts.length) return res.status(400).json({ error: { message: 'No accounts provided' } });

    const result = await db.replaceCounselorAccounts(accounts);
    return res.json({ success: true, importedCount: result.importedCount, excludedCount: result.excludedCount, totalRows: accounts.length });
  } catch (err) {
    console.error('[accounts-import-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

// POST /api/accounts - create account (admin)
router.post('/accounts', async (req, res) => {
  if (!db || !db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
  try {
    const body = req.body || {};
    const account = await db.createAccount(body);
    return res.status(201).json({ account });
  } catch (err) {
    console.error('[accounts-create-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

// PUT /api/accounts/:id - update account
router.put('/accounts/:id', async (req, res) => {
  if (!db || !db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await db.updateAccount(id, body);
    if (!updated) return res.status(404).json({ error: { message: 'Account not found or nothing to update' } });
    return res.json({ account: updated });
  } catch (err) {
    console.error('[accounts-update-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

// DELETE /api/accounts/:id - delete account
router.delete('/accounts/:id', async (req, res) => {
  if (!db || !db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
  try {
    const id = req.params.id;
    await db.deleteAccount(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('[accounts-delete-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

// POST /api/accounts/:id/password - change password
router.post('/accounts/:id/password', async (req, res) => {
  if (!db || !db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
  try {
    const id = req.params.id;
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: { message: 'password required' } });
    const ok = await db.updateAccountPassword(id, password);
    if (!ok) return res.status(404).json({ error: { message: 'Account not found' } });
    return res.json({ success: true });
  } catch (err) {
    console.error('[accounts-password-error]', err);
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

module.exports = router;
