function normalizeLoginId(value) {
  return String(value || '').trim().toLowerCase();
}

module.exports = { normalizeLoginId };
