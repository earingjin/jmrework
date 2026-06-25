const jwt = require('jsonwebtoken');

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (['admin', 'administrator', '관리자'].includes(value)) return 'admin';
  if (['counselor', 'user', '상담사'].includes(value)) return 'counselor';
  return value;
}

function requireJwtSecret() {
  if (!process.env.JWT_SECRET) {
    console.error('[config-error] JWT_SECRET is required. Set it before starting the server.');
    process.exit(1);
  }
}

function authRequired(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: { message: 'Authentication required' } });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      accountId: payload.accountId,
      role: normalizeRole(payload.role)
    };
    return next();
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

function adminRequired(req, res, next) {
  if (normalizeRole(req.user?.role) !== 'admin') {
    return res.status(403).json({ error: { message: 'Admin access required' } });
  }
  return next();
}

function createRateLimit({ windowMs, max, message }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip || req.socket?.remoteAddress || 'unknown'}:${req.originalUrl.split('?')[0]}`;
    const bucket = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    hits.set(key, bucket);

    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: { message } });
    }

    return next();
  };
}

module.exports = {
  normalizeRole,
  requireJwtSecret,
  authRequired,
  adminRequired,
  createRateLimit
};
