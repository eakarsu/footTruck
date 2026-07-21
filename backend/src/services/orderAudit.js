const { digestJson } = require('../lib/canonical');
const prisma = require('../lib/prisma');

function eventHashInput(event) {
  return {
    orderId: event.orderId,
    sequence: event.sequence,
    eventType: event.eventType,
    source: event.source,
    actorId: event.actorId,
    actorRole: event.actorRole,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    fromPaymentStatus: event.fromPaymentStatus,
    toPaymentStatus: event.toPaymentStatus,
    fromFulfillmentStatus: event.fromFulfillmentStatus,
    toFulfillmentStatus: event.toFulfillmentStatus,
    idempotencyKey: event.idempotencyKey,
    requestId: event.requestId,
    previousHash: event.previousHash,
    data: event.data,
    createdAt: event.createdAt,
  };
}

async function appendOrderEventTx(tx, input) {
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', input.orderId);
  const duplicate = await tx.orderEvent.findUnique({
    where: { orderId_idempotencyKey: { orderId: input.orderId, idempotencyKey: input.idempotencyKey } },
  });
  if (duplicate) {
    if (duplicate.eventType !== input.eventType) throw new Error('Order event idempotency key was reused');
    return duplicate;
  }
  const previous = await tx.orderEvent.findFirst({
    where: { orderId: input.orderId },
    orderBy: { sequence: 'desc' },
  });
  const createdAt = input.createdAt || new Date();
  const event = {
    ...input,
    sequence: (previous?.sequence || 0n) + 1n,
    previousHash: previous?.eventHash || null,
    createdAt,
    actorId: input.actorId || null,
    actorRole: input.actorRole || null,
    fromStatus: input.fromStatus || null,
    toStatus: input.toStatus || null,
    fromPaymentStatus: input.fromPaymentStatus || null,
    toPaymentStatus: input.toPaymentStatus || null,
    fromFulfillmentStatus: input.fromFulfillmentStatus || null,
    toFulfillmentStatus: input.toFulfillmentStatus || null,
    data: input.data || null,
  };
  return tx.orderEvent.create({ data: { ...event, eventHash: digestJson(eventHashInput(event)) } });
}

async function verifyOrderAuditChain(orderId) {
  const events = await prisma.orderEvent.findMany({ where: { orderId }, orderBy: { sequence: 'asc' } });
  let previousHash = null;
  let sequence = 1n;
  for (const event of events) {
    if (event.sequence !== sequence || event.previousHash !== previousHash) return false;
    if (event.eventHash !== digestJson(eventHashInput(event))) return false;
    previousHash = event.eventHash;
    sequence += 1n;
  }
  return true;
}

module.exports = { appendOrderEventTx, verifyOrderAuditChain };
