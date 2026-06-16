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

module.exports = router;
