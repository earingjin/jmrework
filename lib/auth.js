const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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

function authenticationError(res, code, message) {
  return res.status(401).json({ error: { code, message } });
}

async function authRequired(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return authenticationError(res, 'AUTH_REQUIRED', 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return authenticationError(res, 'INVALID_TOKEN', 'Invalid or expired token');
  }
  if (!Number.isInteger(payload.tokenVersion) || payload.tokenVersion < 0) {
    return authenticationError(res, 'TOKEN_REVOKED', 'Invalid or expired token');
  }

  try {
    // Lazy loading avoids a circular dependency because accountStore also uses normalizeRole.
    const accountStore = require('./accountStore');
    const account = await accountStore.findAccountById(payload.accountId);
    if (!account || String(account.status || 'active').toLowerCase() !== 'active') {
      return authenticationError(res, 'TOKEN_REVOKED', 'Invalid or expired token');
    }
    const currentVersion = Number(account.token_version ?? account.tokenVersion ?? 0);
    if (payload.tokenVersion !== currentVersion) {
      return authenticationError(res, 'TOKEN_REVOKED', 'Invalid or expired token');
    }
    req.user = {
      accountId: account.id,
      role: normalizeRole(account.role),
      tokenVersion: currentVersion,
      account
    };
    return next();
  } catch (error) {
    const trackingId = crypto.randomUUID();
    console.error(`[auth-store-unavailable] code=AUTH_SERVICE_UNAVAILABLE trackingId=${trackingId}`);
    if (process.env.AUTH_DEBUG_ERRORS === 'true' && process.env.NODE_ENV !== 'production') {
      console.error(`[auth-store-debug] trackingId=${trackingId} name=${String(error?.name || 'Error')}`);
    }
    return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Authentication service unavailable' } });
  }
}

function adminRequired(req, res, next) {
  if (normalizeRole(req.user?.role) !== 'admin') {
    return res.status(403).json({ error: { message: 'Admin access required' } });
  }
  return next();
}

function createRateLimit({ windowMs, max, message, keyGenerator, maxEntries = 10000, cleanupIntervalMs = windowMs, resetOnSuccess = false }) {
  const hits = new Map();
  let lastCleanupAt = 0;

  function cleanup(now) {
    if (now - lastCleanupAt < cleanupIntervalMs && hits.size < maxEntries) return;
    lastCleanupAt = now;
    for (const [key, bucket] of hits) {
      if (bucket.resetAt <= now) hits.delete(key);
    }
  }

  return (req, res, next) => {
    const now = Date.now();
    cleanup(now);
    const key = keyGenerator
      ? String(keyGenerator(req))
      : `${req.ip || req.socket?.remoteAddress || 'unknown'}:${req.originalUrl.split('?')[0]}`;
    let bucket = hits.get(key);
    if (!bucket && hits.size >= maxEntries) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: { code: 'RATE_LIMIT_CAPACITY', message } });
    }
    bucket = bucket || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    hits.delete(key);
    hits.set(key, bucket);
    if (resetOnSuccess) {
      res.once('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) hits.delete(key);
      });
    }

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
