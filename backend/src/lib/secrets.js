function requireConfig(name, options = {}) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} must be configured`);
  }
  const minimumLength = options.minimumLength || 1;
  if (value.length < minimumLength) {
    throw new Error(`${name} must contain at least ${minimumLength} characters`);
  }
  return value;
}

module.exports = { requireConfig };
