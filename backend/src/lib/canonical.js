const { createHash } = require('crypto');

function normalize(value) {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, normalize(value[key])])
    );
  }
  return value === undefined ? null : value;
}

function canonicalJson(value) {
  return JSON.stringify(normalize(value));
}

function sha256(value) {
  return createHash('sha256').update(Buffer.isBuffer(value) ? value : String(value)).digest('hex');
}

function digestJson(value) {
  return sha256(canonicalJson(value));
}

module.exports = { canonicalJson, digestJson, sha256 };
