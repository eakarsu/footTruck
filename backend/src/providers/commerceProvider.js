const { createHmac, timingSafeEqual } = require('crypto');
const { canonicalJson, digestJson } = require('../lib/canonical');
const { requireConfig } = require('../lib/secrets');

const OPERATION_PREFIX = Object.freeze({
  TAX_QUOTE: 'TAX',
  PAYMENT: 'PAYMENT',
  REFUND: 'PAYMENT',
  DELIVERY: 'DELIVERY',
  RECONCILIATION: 'PAYMENT',
});

class CommerceProviderError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'CommerceProviderError';
    this.status = status;
  }
}

function validateProviderEvidence(raw, expected = {}) {
  if (!raw || raw.licensed !== true || typeof raw.provider !== 'string' || !raw.provider.trim()) {
    throw new CommerceProviderError('Provider evidence is incomplete or unlicensed');
  }
  if (typeof raw.eventId !== 'string' || !raw.eventId.trim() || typeof raw.sourceOrderRef !== 'string') {
    throw new CommerceProviderError('Provider event identity is missing');
  }
  if (!['PENDING', 'REQUIRES_ACTION', 'AUTHORIZED', 'SUCCEEDED', 'FAILED'].includes(raw.status)) {
    throw new CommerceProviderError('Provider returned an unsupported status');
  }
  const sourceTimestamp = new Date(raw.sourceTimestamp);
  if (Number.isNaN(sourceTimestamp.getTime()) || !raw.result || typeof raw.result !== 'object' || Array.isArray(raw.result)) {
    throw new CommerceProviderError('Provider evidence timestamp or result is invalid');
  }
  if (expected.sourceOrderRef && raw.sourceOrderRef !== expected.sourceOrderRef) {
    throw new CommerceProviderError('Provider evidence does not match the submitted order reference', 409);
  }
  if (expected.operation === 'TAX_QUOTE' && (!Number.isInteger(raw.result.taxCents) || raw.result.taxCents < 0)) {
    throw new CommerceProviderError('Tax provider must return a non-negative integer taxCents');
  }
  return {
    licensed: true,
    provider: raw.provider,
    eventId: raw.eventId,
    sourceTimestamp,
    sourceOrderRef: raw.sourceOrderRef,
    status: raw.status,
    result: raw.result,
    payloadDigest: digestJson(raw),
  };
}

async function callCommerceProvider(operation, input) {
  const prefix = OPERATION_PREFIX[operation];
  if (!prefix) throw new CommerceProviderError(`Unsupported provider operation ${operation}`, 400);
  const url = requireConfig(`${prefix}_PROVIDER_URL`);
  const token = requireConfig(`${prefix}_PROVIDER_TOKEN`);
  const body = {
    operation,
    sourceOrderRef: input.sourceOrderRef,
    currency: input.currency || 'USD',
    amountCents: input.amountCents,
    lineItems: input.lineItems,
    destination: input.destination,
    metadata: input.metadata || {},
  };
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'idempotency-key': input.idempotencyKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new CommerceProviderError(`${prefix} provider unavailable: ${error.message}`);
  }
  if (!response.ok) throw new CommerceProviderError(`${prefix} provider returned HTTP ${response.status}`);
  let raw;
  try {
    raw = await response.json();
  } catch {
    throw new CommerceProviderError(`${prefix} provider returned invalid JSON`);
  }
  return validateProviderEvidence(raw, { operation, sourceOrderRef: input.sourceOrderRef });
}

function verifyProviderWebhook(rawBody, signature, secret) {
  if (!/^[a-f0-9]{64}$/i.test(signature || '')) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(signature.toLowerCase(), 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

function deriveCustomerAccessToken(idempotencyKey) {
  const secret = requireConfig('CUSTOMER_TOKEN_SECRET', { minimumLength: 32 });
  return createHmac('sha256', secret).update(canonicalJson({ purpose: 'order-access', idempotencyKey })).digest('hex');
}

module.exports = {
  CommerceProviderError,
  callCommerceProvider,
  deriveCustomerAccessToken,
  validateProviderEvidence,
  verifyProviderWebhook,
};
