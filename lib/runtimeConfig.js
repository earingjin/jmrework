const net = require('net');

const MAX_TRUST_PROXY_HOPS = 5;
const APPROVED_PROXY_NAMES = new Set(['loopback', 'linklocal', 'uniquelocal']);

function validCidr(value) {
  const [address, prefixText, extra] = String(value).split('/');
  if (extra !== undefined || !address || prefixText === undefined || !/^\d+$/.test(prefixText)) return false;
  const version = net.isIP(address);
  const prefix = Number(prefixText);
  return version === 4 ? prefix >= 0 && prefix <= 32 : version === 6 ? prefix >= 0 && prefix <= 128 : false;
}

function approvedProxyToken(value) {
  return APPROVED_PROXY_NAMES.has(value.toLowerCase()) || Boolean(net.isIP(value)) || validCidr(value);
}

function parseTrustProxy(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'false' || raw === '0') return false;
  if (raw.toLowerCase() === 'true') throw new Error('TRUST_PROXY=true is not allowed');
  if (/^-?\d+$/.test(raw)) {
    const hops = Number(raw);
    if (!Number.isInteger(hops) || hops < 0 || hops > MAX_TRUST_PROXY_HOPS) {
      throw new Error(`TRUST_PROXY hop count must be between 0 and ${MAX_TRUST_PROXY_HOPS}`);
    }
    return hops;
  }

  const tokens = raw.split(',').map((item) => item.trim());
  if (!tokens.length || tokens.some((item) => !item || !approvedProxyToken(item))) {
    throw new Error('TRUST_PROXY contains an unapproved proxy address or CIDR');
  }
  return tokens.length === 1 ? tokens[0] : tokens;
}

function validateProductionStorage(env = process.env) {
  if (String(env.NODE_ENV || '').toLowerCase() === 'production' && !String(env.DATABASE_URL || '').trim()) {
    throw new Error('DATABASE_URL is required when NODE_ENV=production');
  }
}

module.exports = { MAX_TRUST_PROXY_HOPS, parseTrustProxy, validateProductionStorage };
