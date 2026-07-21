const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertFulfillmentTransition,
  assertOrderTransition,
  assertPaymentTransition,
  paymentOutcome,
} = require('../../src/domain/orderStateMachine');

test('order state machine accepts the proven happy path', () => {
  const transitions = [
    ['PENDING', 'RESERVED'],
    ['RESERVED', 'PAYMENT_PENDING'],
    ['PAYMENT_PENDING', 'CONFIRMED'],
    ['CONFIRMED', 'PREPARING'],
    ['PREPARING', 'PARTIALLY_FULFILLED'],
    ['PARTIALLY_FULFILLED', 'READY'],
    ['READY', 'PICKED_UP'],
  ];
  transitions.forEach(([from, to]) => assert.doesNotThrow(() => assertOrderTransition(from, to)));
});

test('order state machine rejects skipped and terminal transitions', () => {
  assert.throws(() => assertOrderTransition('RESERVED', 'READY'), /Invalid order/);
  assert.throws(() => assertOrderTransition('PICKED_UP', 'CANCELLED'), /Invalid order/);
  assert.throws(() => assertOrderTransition('CANCELLED', 'RESERVED'), /Invalid order/);
});

test('exception recovery is explicit but cannot invent a terminal reversal', () => {
  assert.doesNotThrow(() => assertOrderTransition('PREPARING', 'EXCEPTION'));
  assert.doesNotThrow(() => assertOrderTransition('EXCEPTION', 'PREPARING'));
  assert.throws(() => assertOrderTransition('CANCELLED', 'EXCEPTION'), /Invalid order/);
});

test('payment state machine permits retry after failure and bounded refunds', () => {
  assert.doesNotThrow(() => assertPaymentTransition('PENDING', 'FAILED'));
  assert.doesNotThrow(() => assertPaymentTransition('FAILED', 'COMPLETED'));
  assert.doesNotThrow(() => assertPaymentTransition('COMPLETED', 'PARTIALLY_REFUNDED'));
  assert.doesNotThrow(() => assertPaymentTransition('PARTIALLY_REFUNDED', 'REFUNDED'));
  assert.throws(() => assertPaymentTransition('REFUNDED', 'COMPLETED'), /Invalid payment/);
});

test('fulfillment is monotonic', () => {
  assert.doesNotThrow(() => assertFulfillmentTransition('UNFULFILLED', 'PARTIAL'));
  assert.doesNotThrow(() => assertFulfillmentTransition('PARTIAL', 'FULFILLED'));
  assert.throws(() => assertFulfillmentTransition('FULFILLED', 'PARTIAL'), /Invalid fulfillment/);
});

test('provider payment outcomes map to deterministic local states', () => {
  assert.deepEqual(paymentOutcome('SUCCEEDED'), { paymentStatus: 'COMPLETED', orderStatus: 'CONFIRMED' });
  assert.deepEqual(paymentOutcome('FAILED'), { paymentStatus: 'FAILED', orderStatus: 'EXCEPTION' });
  assert.deepEqual(paymentOutcome('REQUIRES_ACTION'), { paymentStatus: 'REQUIRES_ACTION', orderStatus: 'PAYMENT_PENDING' });
});
