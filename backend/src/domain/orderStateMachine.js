const ORDER_TRANSITIONS = Object.freeze({
  PENDING: new Set(['RESERVED', 'CANCELLED', 'EXCEPTION']),
  RESERVED: new Set(['PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED', 'EXCEPTION']),
  PAYMENT_PENDING: new Set(['CONFIRMED', 'CANCELLED', 'EXCEPTION']),
  CONFIRMED: new Set(['PREPARING', 'CANCELLED', 'EXCEPTION']),
  PREPARING: new Set(['PARTIALLY_FULFILLED', 'READY', 'CANCELLED', 'EXCEPTION']),
  PARTIALLY_FULFILLED: new Set(['PARTIALLY_FULFILLED', 'READY', 'CANCELLED', 'EXCEPTION']),
  READY: new Set(['PICKED_UP', 'CANCELLED', 'EXCEPTION']),
  PICKED_UP: new Set(['EXCEPTION']),
  CANCELLED: new Set(),
  EXCEPTION: new Set(['RESERVED', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'PARTIALLY_FULFILLED', 'READY', 'PICKED_UP', 'CANCELLED']),
});

const PAYMENT_TRANSITIONS = Object.freeze({
  PENDING: new Set(['REQUIRES_ACTION', 'AUTHORIZED', 'COMPLETED', 'FAILED']),
  REQUIRES_ACTION: new Set(['AUTHORIZED', 'COMPLETED', 'FAILED']),
  AUTHORIZED: new Set(['COMPLETED', 'FAILED']),
  COMPLETED: new Set(['PARTIALLY_REFUNDED', 'REFUNDED']),
  FAILED: new Set(['PENDING', 'REQUIRES_ACTION', 'AUTHORIZED', 'COMPLETED']),
  PARTIALLY_REFUNDED: new Set(['PARTIALLY_REFUNDED', 'REFUNDED']),
  REFUNDED: new Set(),
});

const FULFILLMENT_TRANSITIONS = Object.freeze({
  UNFULFILLED: new Set(['PARTIAL', 'FULFILLED', 'CANCELLED']),
  PARTIAL: new Set(['PARTIAL', 'FULFILLED', 'CANCELLED']),
  FULFILLED: new Set(),
  CANCELLED: new Set(),
});

function assertTransition(table, current, next, label) {
  if (current === next) return;
  if (!table[current]?.has(next)) {
    throw new Error(`Invalid ${label} transition ${current} -> ${next}`);
  }
}

function assertOrderTransition(current, next) {
  assertTransition(ORDER_TRANSITIONS, current, next, 'order');
}

function assertPaymentTransition(current, next) {
  assertTransition(PAYMENT_TRANSITIONS, current, next, 'payment');
}

function assertFulfillmentTransition(current, next) {
  assertTransition(FULFILLMENT_TRANSITIONS, current, next, 'fulfillment');
}

function paymentOutcome(status) {
  if (status === 'SUCCEEDED') return { paymentStatus: 'COMPLETED', orderStatus: 'CONFIRMED' };
  if (status === 'AUTHORIZED') return { paymentStatus: 'AUTHORIZED', orderStatus: 'PAYMENT_PENDING' };
  if (status === 'REQUIRES_ACTION' || status === 'PENDING') return { paymentStatus: 'REQUIRES_ACTION', orderStatus: 'PAYMENT_PENDING' };
  if (status === 'FAILED') return { paymentStatus: 'FAILED', orderStatus: 'EXCEPTION' };
  throw new Error(`Unsupported provider payment status ${status}`);
}

module.exports = {
  ORDER_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  FULFILLMENT_TRANSITIONS,
  assertOrderTransition,
  assertPaymentTransition,
  assertFulfillmentTransition,
  paymentOutcome,
};
