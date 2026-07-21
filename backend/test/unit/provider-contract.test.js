const { createHmac } = require('crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateProviderEvidence,
  verifyProviderWebhook,
} = require('../../src/providers/commerceProvider');

function taxEvidence(overrides = {}) {
  return {
    licensed: true,
    provider: 'licensed-tax-test',
    eventId: 'tax-event-1',
    sourceTimestamp: '2026-07-20T00:00:00.000Z',
    sourceOrderRef: 'request-1',
    status: 'SUCCEEDED',
    result: { taxCents: 92 },
    ...overrides,
  };
}

test('licensed tax evidence is typed and payload-digested', () => {
  const evidence = validateProviderEvidence(taxEvidence(), { operation: 'TAX_QUOTE', sourceOrderRef: 'request-1' });
  assert.equal(evidence.result.taxCents, 92);
  assert.match(evidence.payloadDigest, /^[a-f0-9]{64}$/);
  assert.ok(evidence.sourceTimestamp instanceof Date);
});

test('provider evidence fails closed on licensing, tax, or identity gaps', () => {
  assert.throws(() => validateProviderEvidence(taxEvidence({ licensed: false })), /unlicensed/);
  assert.throws(() => validateProviderEvidence(taxEvidence({ result: { taxCents: 9.2 } }), { operation: 'TAX_QUOTE' }), /taxCents/);
  assert.throws(() => validateProviderEvidence(taxEvidence(), { sourceOrderRef: 'different' }), /does not match/);
});

test('webhook signatures require a valid HMAC', () => {
  const body = JSON.stringify(taxEvidence());
  const secret = 'unit-test-commerce-webhook-secret-more-than-32-characters';
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyProviderWebhook(body, signature, secret), true);
  assert.equal(verifyProviderWebhook(`${body} `, signature, secret), false);
  assert.equal(verifyProviderWebhook(body, 'invalid', secret), false);
});
