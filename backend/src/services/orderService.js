const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');
const { digestJson, sha256 } = require('../lib/canonical');
const { appendOrderEventTx } = require('./orderAudit');
const {
  assertFulfillmentTransition,
  assertOrderTransition,
  assertPaymentTransition,
  paymentOutcome,
} = require('../domain/orderStateMachine');
const { deriveCustomerAccessToken } = require('../providers/commerceProvider');

class OrderWorkflowError extends Error {
  constructor(message, status = 409, code = 'ORDER_WORKFLOW_ERROR') {
    super(message);
    this.name = 'OrderWorkflowError';
    this.status = status;
    this.code = code;
  }
}

function contextDefaults(context = {}) {
  return {
    requestId: context.requestId || randomUUID(),
    source: context.source || 'API',
  };
}

function actorFields(actor, actorRole) {
  return { actorId: actor?.id || null, actorRole: actorRole || (actor ? actor.role : 'CUSTOMER') };
}

function publicOrder(order, customerAccessToken) {
  return { ...order, customerAccessToken };
}

function assertEvidence(evidence, sourceOrderRef) {
  if (!evidence?.licensed || !evidence.provider || !evidence.eventId || !evidence.payloadDigest) {
    throw new OrderWorkflowError('Licensed provider evidence is required', 502, 'PROVIDER_EVIDENCE_REQUIRED');
  }
  if (evidence.sourceOrderRef !== sourceOrderRef) {
    throw new OrderWorkflowError('Provider evidence order reference mismatch', 409, 'PROVIDER_REFERENCE_MISMATCH');
  }
}

async function lockOrderTx(tx, orderId) {
  const rows = await tx.$queryRawUnsafe('SELECT id FROM "Order" WHERE id = $1 FOR UPDATE', orderId);
  if (rows.length === 0) throw new OrderWorkflowError('Order not found', 404, 'ORDER_NOT_FOUND');
  return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
}

async function recordProviderEventTx(tx, input) {
  const existing = await tx.orderProviderEvent.findUnique({
    where: { provider_providerEventId: { provider: input.evidence.provider, providerEventId: input.evidence.eventId } },
  });
  if (existing) {
    if (existing.payloadDigest !== input.evidence.payloadDigest || existing.orderId !== input.order.id) {
      throw new OrderWorkflowError('Provider event identity was reused with altered evidence', 409, 'ALTERED_PROVIDER_REPLAY');
    }
    return { event: existing, replay: true };
  }
  const event = await tx.orderProviderEvent.create({
    data: {
      provider: input.evidence.provider,
      providerEventId: input.evidence.eventId,
      direction: input.direction,
      operation: input.operation,
      status: input.evidence.status,
      sourceTimestamp: input.evidence.sourceTimestamp,
      sourceOrderRef: input.evidence.sourceOrderRef,
      payloadDigest: input.evidence.payloadDigest,
      idempotencyKey: input.idempotencyKey,
      result: input.evidence.result,
      processedAt: new Date(),
      truckId: input.order.truckId,
      orderId: input.order.id,
    },
  });
  return { event, replay: false };
}

async function createReservedOrder({ input, taxEvidence, actor = null, actorRole, context }) {
  const ctx = contextDefaults(context);
  if (!input?.truckId || !input.idempotencyKey || !Array.isArray(input.items) || input.items.length === 0) {
    throw new OrderWorkflowError('truckId, idempotencyKey, and at least one item are required', 400, 'INVALID_ORDER');
  }
  if (new Set(input.items.map((item) => item.menuItemId)).size !== input.items.length) {
    throw new OrderWorkflowError('Duplicate menu items must be consolidated', 400, 'DUPLICATE_MENU_ITEM');
  }
  for (const item of input.items) {
    if (!item.menuItemId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
      throw new OrderWorkflowError('Each item requires a menuItemId and quantity from 1 to 100', 400, 'INVALID_ORDER_ITEM');
    }
  }
  assertEvidence(taxEvidence, input.idempotencyKey);
  if (taxEvidence.status !== 'SUCCEEDED' || !Number.isInteger(taxEvidence.result.taxCents) || taxEvidence.result.taxCents < 0) {
    throw new OrderWorkflowError('A successful authoritative tax quote is required', 502, 'TAX_QUOTE_FAILED');
  }
  const requestDigest = digestJson({
    truckId: input.truckId,
    type: input.type || 'WALK_IN',
    customerName: input.customerName || null,
    customerPhone: input.customerPhone || null,
    customerEmail: input.customerEmail || null,
    items: input.items,
    tipCents: input.tipCents || 0,
    pickupWindowId: input.pickupWindowId || null,
    deliveryDestination: input.deliveryDestination || null,
  });
  const customerAccessToken = deriveCustomerAccessToken(input.idempotencyKey);
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (existing.requestDigest !== requestDigest) {
      throw new OrderWorkflowError('Order idempotency key was reused with a different request', 409, 'IDEMPOTENCY_CONFLICT');
    }
    return publicOrder(await getOrder(existing.id), customerAccessToken);
  }

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (duplicate) {
      if (duplicate.requestDigest !== requestDigest) throw new OrderWorkflowError('Order idempotency conflict');
      return publicOrder(await getOrder(duplicate.id, tx), customerAccessToken);
    }
    const menuItems = await tx.menuItem.findMany({
      where: { id: { in: input.items.map((item) => item.menuItemId) } },
      include: {
        category: { include: { menu: true } },
        ingredients: { include: { inventoryItem: true } },
      },
    });
    if (menuItems.length !== input.items.length) throw new OrderWorkflowError('One or more menu items do not exist', 400, 'MENU_ITEM_NOT_FOUND');
    const menuById = new Map(menuItems.map((item) => [item.id, item]));
    for (const item of menuItems) {
      if (item.category.menu.truckId !== input.truckId || !item.isAvailable || item.isSoldOut) {
        throw new OrderWorkflowError(`Menu item ${item.id} is unavailable for this truck`, 409, 'MENU_ITEM_UNAVAILABLE');
      }
      if (item.ingredients.length === 0) {
        throw new OrderWorkflowError(`Menu item ${item.id} has no inventory recipe`, 409, 'INVENTORY_RECIPE_REQUIRED');
      }
      if (item.ingredients.some((ingredient) => ingredient.inventoryItem.truckId !== input.truckId)) {
        throw new OrderWorkflowError('Menu recipe references inventory from another truck', 409, 'INVENTORY_SCOPE_MISMATCH');
      }
    }
    const inventoryIds = [...new Set(menuItems.flatMap((item) => item.ingredients.map((ingredient) => ingredient.inventoryItemId)))];
    await tx.$queryRawUnsafe('SELECT id FROM "InventoryItem" WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE', inventoryIds);
    if (input.pickupWindowId) {
      const slots = await tx.$queryRawUnsafe('SELECT id FROM "PreOrderWindow" WHERE id = $1 FOR UPDATE', input.pickupWindowId);
      if (slots.length === 0) throw new OrderWorkflowError('Pickup window not found', 404, 'PICKUP_WINDOW_NOT_FOUND');
      const window = await tx.preOrderWindow.findUniqueOrThrow({
        where: { id: input.pickupWindowId }, include: { truckLocation: true },
      });
      if (window.truckLocation.truckId !== input.truckId || !window.isAvailable || window.currentOrders >= window.maxOrders) {
        throw new OrderWorkflowError('Pickup window is unavailable', 409, 'PICKUP_WINDOW_FULL');
      }
    }
    const lineItems = input.items.map((requested) => {
      const menuItem = menuById.get(requested.menuItemId);
      const unitPriceCents = Math.round((menuItem.isSpecial && menuItem.specialPrice != null ? menuItem.specialPrice : menuItem.price) * 100);
      return { requested, menuItem, unitPriceCents, totalCents: unitPriceCents * requested.quantity };
    });
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
    const taxCents = taxEvidence.result.taxCents;
    const tipCents = Number.isInteger(input.tipCents) && input.tipCents >= 0 ? input.tipCents : 0;
    const totalCents = subtotalCents + taxCents + tipCents;
    const order = await tx.order.create({
      data: {
        orderNumber: `FT-${randomUUID().replaceAll('-', '').slice(0, 14).toUpperCase()}`,
        truckId: input.truckId,
        userId: actor?.id || null,
        type: input.type || 'WALK_IN',
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        subtotal: subtotalCents / 100,
        tax: taxCents / 100,
        tip: tipCents / 100,
        total: totalCents / 100,
        subtotalCents,
        taxCents,
        tipCents,
        totalCents,
        requestDigest,
        idempotencyKey: input.idempotencyKey,
        customerAccessTokenHash: sha256(customerAccessToken),
        notes: input.notes,
        paymentMethod: input.paymentMethod,
        status: 'RESERVED',
        reservationStatus: 'RESERVED',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'UNFULFILLED',
        reservationExpiresAt: input.reservationExpiresAt || new Date(Date.now() + 15 * 60 * 1000),
        pickupWindowId: input.pickupWindowId || null,
        scheduledPickup: input.scheduledPickup || null,
      },
    });
    for (const line of lineItems) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: line.menuItem.id,
          quantity: line.requested.quantity,
          unitPrice: line.unitPriceCents / 100,
          totalPrice: line.totalCents / 100,
          specialInstructions: line.requested.specialInstructions,
        },
      });
      for (const ingredient of line.menuItem.ingredients) {
        const requiredQuantity = ingredient.quantityPerItem * line.requested.quantity;
        const updated = await tx.inventoryItem.updateMany({
          where: { id: ingredient.inventoryItemId, quantity: { gte: requiredQuantity } },
          data: { quantity: { decrement: requiredQuantity } },
        });
        if (updated.count !== 1) {
          throw new OrderWorkflowError(`Insufficient inventory for ${ingredient.inventoryItem.name}`, 409, 'OVERSELL_PREVENTED');
        }
        const inventory = await tx.inventoryItem.findUniqueOrThrow({ where: { id: ingredient.inventoryItemId } });
        await tx.inventoryReservation.create({
          data: { orderId: order.id, orderItemId: orderItem.id, inventoryItemId: ingredient.inventoryItemId, quantity: requiredQuantity },
        });
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: inventory.id,
            actorId: actor?.id || null,
            quantityDelta: -requiredQuantity,
            balanceAfter: inventory.quantity,
            reason: 'ORDER_RESERVED',
            referenceType: 'Order',
            referenceId: order.id,
            idempotencyKey: `reserve:${order.id}:${orderItem.id}:${inventory.id}`,
          },
        });
      }
    }
    if (input.pickupWindowId) {
      await tx.preOrderWindow.update({ where: { id: input.pickupWindowId }, data: { currentOrders: { increment: 1 } } });
    }
    await recordProviderEventTx(tx, {
      order,
      evidence: taxEvidence,
      direction: 'OUTBOUND_RESULT',
      operation: 'TAX_QUOTE',
      idempotencyKey: `tax:${input.idempotencyKey}`,
    });
    await appendOrderEventTx(tx, {
      orderId: order.id,
      eventType: 'ORDER_RESERVED',
      source: ctx.source,
      ...actorFields(actor, actorRole),
      fromStatus: 'PENDING',
      toStatus: 'RESERVED',
      idempotencyKey: `create:${input.idempotencyKey}`,
      requestId: ctx.requestId,
      data: { subtotalCents, taxCents, totalCents, taxProvider: taxEvidence.provider, taxEventId: taxEvidence.eventId },
    });
    return publicOrder(await getOrder(order.id, tx), customerAccessToken);
  }, { isolationLevel: 'Serializable' });
}

async function applyPaymentEvidence({ orderId, evidence, idempotencyKey, actor = null, actorRole, context, direction = 'OUTBOUND_RESULT' }) {
  const ctx = contextDefaults(context);
  return prisma.$transaction(async (tx) => {
    const order = await lockOrderTx(tx, orderId);
    assertEvidence(evidence, order.orderNumber);
    const providerRecord = await recordProviderEventTx(tx, {
      order, evidence, direction, operation: 'PAYMENT', idempotencyKey,
    });
    if (providerRecord.replay) return getOrder(order.id, tx);
    const outcome = paymentOutcome(evidence.status);
    assertPaymentTransition(order.paymentStatus, outcome.paymentStatus);
    assertOrderTransition(order.status, outcome.orderStatus);
    const updated = await tx.order.update({
      where: { id: order.id, version: order.version },
      data: {
        paymentStatus: outcome.paymentStatus,
        status: outcome.orderStatus,
        paymentProvider: evidence.provider,
        paymentIntentId: evidence.result.paymentIntentId || order.paymentIntentId,
        exceptionCode: evidence.status === 'FAILED' ? (evidence.result.failureCode || 'PAYMENT_FAILED') : null,
        exceptionMessage: evidence.status === 'FAILED' ? (evidence.result.failureReason || 'Payment provider rejected the payment') : null,
        exceptionFromStatus: evidence.status === 'FAILED' ? order.status : null,
        version: { increment: 1 },
      },
    });
    await appendOrderEventTx(tx, {
      orderId: order.id,
      eventType: evidence.status === 'FAILED' ? 'PAYMENT_FAILED' : 'PAYMENT_UPDATED',
      source: direction === 'INBOUND_WEBHOOK' ? 'PROVIDER_WEBHOOK' : ctx.source,
      ...actorFields(actor, actorRole),
      fromStatus: order.status,
      toStatus: updated.status,
      fromPaymentStatus: order.paymentStatus,
      toPaymentStatus: updated.paymentStatus,
      idempotencyKey: `payment:${evidence.provider}:${evidence.eventId}`,
      requestId: ctx.requestId,
      data: { provider: evidence.provider, providerEventId: evidence.eventId, payloadDigest: evidence.payloadDigest },
    });
    return getOrder(order.id, tx);
  }, { isolationLevel: 'Serializable' });
}

async function applyDeliveryEvidence({ orderId, evidence, idempotencyKey, actor = null, actorRole, context, direction = 'OUTBOUND_RESULT' }) {
  const ctx = contextDefaults(context);
  return prisma.$transaction(async (tx) => {
    const order = await lockOrderTx(tx, orderId);
    assertEvidence(evidence, order.orderNumber);
    const providerRecord = await recordProviderEventTx(tx, {
      order, evidence, direction, operation: 'DELIVERY', idempotencyKey,
    });
    if (providerRecord.replay) return getOrder(orderId, tx);
    const failed = evidence.status === 'FAILED';
    if (failed) assertOrderTransition(order.status, 'EXCEPTION');
    const updated = await tx.order.update({
      where: { id: order.id, version: order.version },
      data: {
        deliveryProvider: evidence.provider,
        deliveryId: evidence.result.deliveryId || order.deliveryId,
        status: failed ? 'EXCEPTION' : order.status,
        exceptionFromStatus: failed ? order.status : order.exceptionFromStatus,
        exceptionCode: failed ? (evidence.result.failureCode || 'DELIVERY_FAILED') : order.exceptionCode,
        exceptionMessage: failed ? (evidence.result.failureReason || 'Delivery provider rejected the request') : order.exceptionMessage,
        version: { increment: 1 },
      },
    });
    await appendOrderEventTx(tx, {
      orderId, eventType: failed ? 'DELIVERY_FAILED' : 'DELIVERY_UPDATED',
      source: direction === 'INBOUND_WEBHOOK' ? 'PROVIDER_WEBHOOK' : ctx.source,
      ...actorFields(actor, actorRole), fromStatus: order.status, toStatus: updated.status,
      idempotencyKey: `delivery:${evidence.provider}:${evidence.eventId}`, requestId: ctx.requestId,
      data: { provider: evidence.provider, providerEventId: evidence.eventId, deliveryId: updated.deliveryId },
    });
    return getOrder(orderId, tx);
  }, { isolationLevel: 'Serializable' });
}

async function reconcilePayment({ orderId, evidence, idempotencyKey, actor, actorRole, context }) {
  const ctx = contextDefaults(context);
  return prisma.$transaction(async (tx) => {
    const order = await lockOrderTx(tx, orderId);
    assertEvidence(evidence, order.orderNumber);
    const providerRecord = await recordProviderEventTx(tx, {
      order, evidence, direction: 'RECONCILIATION', operation: 'RECONCILIATION', idempotencyKey,
    });
    if (providerRecord.replay) return getOrder(orderId, tx);
    const providerStatus = evidence.result.paymentStatus;
    const validStatuses = ['PENDING', 'REQUIRES_ACTION', 'AUTHORIZED', 'COMPLETED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'];
    if (!validStatuses.includes(providerStatus)) throw new OrderWorkflowError('Reconciliation evidence lacks a valid paymentStatus', 502);
    const mismatch = providerStatus !== order.paymentStatus;
    const updated = mismatch
      ? await tx.order.update({
        where: { id: order.id, version: order.version },
        data: {
          status: 'EXCEPTION', exceptionFromStatus: order.status,
          exceptionCode: 'PAYMENT_RECONCILIATION_MISMATCH',
          exceptionMessage: `Provider reports ${providerStatus}; local state is ${order.paymentStatus}`,
          version: { increment: 1 },
        },
      })
      : order;
    await appendOrderEventTx(tx, {
      orderId, eventType: mismatch ? 'RECONCILIATION_MISMATCH' : 'RECONCILIATION_MATCHED',
      source: ctx.source, ...actorFields(actor, actorRole), fromStatus: order.status, toStatus: updated.status,
      idempotencyKey: `reconcile:${evidence.provider}:${evidence.eventId}`, requestId: ctx.requestId,
      data: { providerStatus, localStatus: order.paymentStatus, providerEventId: evidence.eventId },
    });
    return getOrder(orderId, tx);
  }, { isolationLevel: 'Serializable' });
}

async function transitionOrder({ orderId, toStatus, eventType, idempotencyKey, actor, actorRole, context }) {
  const ctx = contextDefaults(context);
  return prisma.$transaction(async (tx) => {
    const order = await lockOrderTx(tx, orderId);
    const duplicate = await tx.orderEvent.findUnique({ where: { orderId_idempotencyKey: { orderId, idempotencyKey } } });
    if (duplicate) return getOrder(orderId, tx);
    assertOrderTransition(order.status, toStatus);
    if (toStatus === 'PREPARING' && order.paymentStatus !== 'COMPLETED') {
      throw new OrderWorkflowError('Payment must complete before preparation', 409, 'PAYMENT_REQUIRED');
    }
    if (toStatus === 'PICKED_UP' && order.fulfillmentStatus !== 'FULFILLED') {
      throw new OrderWorkflowError('Order must be fully fulfilled before pickup', 409, 'FULFILLMENT_REQUIRED');
    }
    const updated = await tx.order.update({
      where: { id: order.id, version: order.version },
      data: {
        status: toStatus,
        actualReadyTime: toStatus === 'READY' ? new Date() : order.actualReadyTime,
        version: { increment: 1 },
      },
    });
    await appendOrderEventTx(tx, {
      orderId,
      eventType,
      source: ctx.source,
      ...actorFields(actor, actorRole),
      fromStatus: order.status,
      toStatus,
      idempotencyKey,
      requestId: ctx.requestId,
    });
    return getOrder(updated.id, tx);
  }, { isolationLevel: 'Serializable' });
}

async function fulfillOrder({ orderId, quantities, idempotencyKey, actor, actorRole, context }) {
  const ctx = contextDefaults(context);
  if (!Array.isArray(quantities) || quantities.length === 0) throw new OrderWorkflowError('Fulfillment quantities are required', 400);
  return prisma.$transaction(async (tx) => {
    const order = await lockOrderTx(tx, orderId);
    const duplicate = await tx.orderEvent.findUnique({ where: { orderId_idempotencyKey: { orderId, idempotencyKey } } });
    if (duplicate) return getOrder(orderId, tx);
    if (!['PREPARING', 'PARTIALLY_FULFILLED'].includes(order.status) || order.paymentStatus !== 'COMPLETED') {
      throw new OrderWorkflowError('Only paid orders in preparation can be fulfilled', 409, 'FULFILLMENT_NOT_ALLOWED');
    }
    const byId = new Map(order.items.map((item) => [item.id, item]));
    for (const entry of quantities) {
      const item = byId.get(entry.orderItemId);
      if (!item || !Number.isInteger(entry.quantity) || entry.quantity < 1 || item.fulfilledQuantity + entry.quantity > item.quantity - item.cancelledQuantity) {
        throw new OrderWorkflowError('Fulfillment quantity exceeds the remaining order item quantity', 409, 'INVALID_FULFILLMENT_QUANTITY');
      }
      await tx.orderItem.update({ where: { id: item.id }, data: { fulfilledQuantity: { increment: entry.quantity } } });
      item.fulfilledQuantity += entry.quantity;
    }
    const fullyFulfilled = order.items.every((item) => item.fulfilledQuantity === item.quantity - item.cancelledQuantity);
    const nextFulfillment = fullyFulfilled ? 'FULFILLED' : 'PARTIAL';
    const nextStatus = fullyFulfilled ? 'READY' : 'PARTIALLY_FULFILLED';
    assertFulfillmentTransition(order.fulfillmentStatus, nextFulfillment);
    assertOrderTransition(order.status, nextStatus);
    if (fullyFulfilled) {
      await tx.inventoryReservation.updateMany({ where: { orderId, status: 'RESERVED' }, data: { status: 'CONSUMED' } });
    }
    const updated = await tx.order.update({
      where: { id: order.id, version: order.version },
      data: {
        fulfillmentStatus: nextFulfillment,
        status: nextStatus,
        actualReadyTime: fullyFulfilled ? new Date() : null,
        version: { increment: 1 },
      },
    });
    await appendOrderEventTx(tx, {
      orderId,
      eventType: fullyFulfilled ? 'FULFILLMENT_COMPLETED' : 'FULFILLMENT_PARTIAL',
      source: ctx.source,
      ...actorFields(actor, actorRole),
      fromStatus: order.status,
      toStatus: nextStatus,
      fromFulfillmentStatus: order.fulfillmentStatus,
      toFulfillmentStatus: nextFulfillment,
      idempotencyKey,
      requestId: ctx.requestId,
      data: { quantities },
    });
    return getOrder(updated.id, tx);
  }, { isolationLevel: 'Serializable' });
}

async function refundOrder({ orderId, amountCents, reason, evidence, idempotencyKey, actor = null, actorRole, context, direction = 'OUTBOUND_RESULT' }) {
  const ctx = contextDefaults(context);
  if (!Number.isInteger(amountCents) || amountCents <= 0 || !reason?.trim()) {
    throw new OrderWorkflowError('Positive integer amountCents and refund reason are required', 400, 'INVALID_REFUND');
  }
  return prisma.$transaction(async (tx) => {
    const order = await lockOrderTx(tx, orderId);
    assertEvidence(evidence, order.orderNumber);
    const existingRefund = await tx.refund.findUnique({ where: { idempotencyKey } });
    if (existingRefund) {
      if (
        existingRefund.orderId !== orderId ||
        existingRefund.amountCents !== amountCents ||
        existingRefund.providerEventId !== evidence.eventId ||
        existingRefund.providerPayloadDigest !== evidence.payloadDigest
      ) throw new OrderWorkflowError('Refund idempotency conflict');
      return { order: await getOrder(orderId, tx), refund: existingRefund };
    }
    if (!['COMPLETED', 'PARTIALLY_REFUNDED'].includes(order.paymentStatus) || amountCents > order.totalCents - order.refundedCents) {
      throw new OrderWorkflowError('Refund exceeds captured, unrefunded payment', 409, 'REFUND_EXCEEDS_PAYMENT');
    }
    const providerRecord = await recordProviderEventTx(tx, {
      order, evidence, direction, operation: 'REFUND', idempotencyKey: `refund-provider:${idempotencyKey}`,
    });
    if (providerRecord.replay) {
      const replayRefund = await tx.refund.findFirst({ where: { provider: evidence.provider, providerEventId: evidence.eventId } });
      return { order: await getOrder(orderId, tx), refund: replayRefund };
    }
    const succeeded = evidence.status === 'SUCCEEDED';
    const refund = await tx.refund.create({
      data: {
        orderId,
        requestedById: actor?.id || null,
        amountCents,
        reason,
        status: succeeded ? 'COMPLETED' : 'FAILED',
        idempotencyKey,
        provider: evidence.provider,
        providerRefundId: evidence.result.refundId || null,
        providerEventId: evidence.eventId,
        providerPayloadDigest: evidence.payloadDigest,
        failureCode: succeeded ? null : (evidence.result.failureCode || 'REFUND_FAILED'),
        failureReason: succeeded ? null : (evidence.result.failureReason || 'Refund provider rejected the request'),
        completedAt: succeeded ? new Date() : null,
      },
    });
    let updated = order;
    if (succeeded) {
      const refundedCents = order.refundedCents + amountCents;
      const nextPayment = refundedCents === order.totalCents ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      assertPaymentTransition(order.paymentStatus, nextPayment);
      updated = await tx.order.update({
        where: { id: order.id, version: order.version },
        data: { refundedCents, paymentStatus: nextPayment, version: { increment: 1 } },
      });
    }
    await appendOrderEventTx(tx, {
      orderId,
      eventType: succeeded ? 'REFUND_COMPLETED' : 'REFUND_FAILED',
      source: direction === 'INBOUND_WEBHOOK' ? 'PROVIDER_WEBHOOK' : ctx.source,
      ...actorFields(actor, actorRole),
      fromStatus: order.status,
      toStatus: updated.status,
      fromPaymentStatus: order.paymentStatus,
      toPaymentStatus: updated.paymentStatus,
      idempotencyKey: `refund:${idempotencyKey}`,
      requestId: ctx.requestId,
      data: { amountCents, reason, provider: evidence.provider, providerEventId: evidence.eventId },
    });
    return { order: await getOrder(orderId, tx), refund };
  }, { isolationLevel: 'Serializable' });
}

async function cancelOrder({ orderId, reason, idempotencyKey, actor = null, actorRole, context }) {
  const ctx = contextDefaults(context);
  if (!reason?.trim()) throw new OrderWorkflowError('Cancellation reason is required', 400);
  return prisma.$transaction(async (tx) => {
    const order = await lockOrderTx(tx, orderId);
    const duplicate = await tx.orderEvent.findUnique({ where: { orderId_idempotencyKey: { orderId, idempotencyKey } } });
    if (duplicate) return getOrder(orderId, tx);
    if (['COMPLETED', 'PARTIALLY_REFUNDED'].includes(order.paymentStatus)) {
      throw new OrderWorkflowError('Captured payment must be refunded before cancellation', 409, 'REFUND_REQUIRED');
    }
    assertOrderTransition(order.status, 'CANCELLED');
    if (order.fulfillmentStatus !== 'CANCELLED') assertFulfillmentTransition(order.fulfillmentStatus, 'CANCELLED');
    const reservations = await tx.inventoryReservation.findMany({ where: { orderId, status: 'RESERVED' } });
    for (const reservation of reservations) {
      const inventory = await tx.inventoryItem.update({
        where: { id: reservation.inventoryItemId }, data: { quantity: { increment: reservation.quantity } },
      });
      await tx.inventoryReservation.update({
        where: { id: reservation.id }, data: { status: 'RELEASED', releasedAt: new Date() },
      });
      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: inventory.id,
          actorId: actor?.id || null,
          quantityDelta: reservation.quantity,
          balanceAfter: inventory.quantity,
          reason: 'ORDER_CANCELLED_RELEASE',
          referenceType: 'Order',
          referenceId: order.id,
          idempotencyKey: `release:${order.id}:${reservation.id}`,
        },
      });
    }
    if (order.pickupWindowId) {
      await tx.$queryRawUnsafe('SELECT id FROM "PreOrderWindow" WHERE id = $1 FOR UPDATE', order.pickupWindowId);
      await tx.preOrderWindow.updateMany({
        where: { id: order.pickupWindowId, currentOrders: { gt: 0 } }, data: { currentOrders: { decrement: 1 } },
      });
    }
    const updated = await tx.order.update({
      where: { id: order.id, version: order.version },
      data: {
        status: 'CANCELLED',
        reservationStatus: 'RELEASED',
        fulfillmentStatus: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
        version: { increment: 1 },
      },
    });
    await appendOrderEventTx(tx, {
      orderId,
      eventType: 'ORDER_CANCELLED',
      source: ctx.source,
      ...actorFields(actor, actorRole),
      fromStatus: order.status,
      toStatus: 'CANCELLED',
      fromFulfillmentStatus: order.fulfillmentStatus,
      toFulfillmentStatus: 'CANCELLED',
      idempotencyKey,
      requestId: ctx.requestId,
      data: { reason, releasedReservations: reservations.length },
    });
    return getOrder(updated.id, tx);
  }, { isolationLevel: 'Serializable' });
}

async function markOrderException({ orderId, code, message, idempotencyKey, actor = null, actorRole, context }) {
  const ctx = contextDefaults(context);
  if (!code || !message) throw new OrderWorkflowError('Exception code and message are required', 400);
  return prisma.$transaction(async (tx) => {
    const order = await lockOrderTx(tx, orderId);
    const duplicate = await tx.orderEvent.findUnique({ where: { orderId_idempotencyKey: { orderId, idempotencyKey } } });
    if (duplicate) return getOrder(orderId, tx);
    assertOrderTransition(order.status, 'EXCEPTION');
    const updated = await tx.order.update({
      where: { id: order.id, version: order.version },
      data: { status: 'EXCEPTION', exceptionFromStatus: order.status, exceptionCode: code, exceptionMessage: message, version: { increment: 1 } },
    });
    await appendOrderEventTx(tx, {
      orderId, eventType: 'ORDER_EXCEPTION', source: ctx.source, ...actorFields(actor, actorRole),
      fromStatus: order.status, toStatus: 'EXCEPTION', idempotencyKey, requestId: ctx.requestId, data: { code, message },
    });
    return getOrder(updated.id, tx);
  }, { isolationLevel: 'Serializable' });
}

async function recoverOrder({ orderId, idempotencyKey, note, actor, actorRole, context }) {
  const ctx = contextDefaults(context);
  return prisma.$transaction(async (tx) => {
    const order = await lockOrderTx(tx, orderId);
    const duplicate = await tx.orderEvent.findUnique({ where: { orderId_idempotencyKey: { orderId, idempotencyKey } } });
    if (duplicate) return getOrder(orderId, tx);
    if (order.status !== 'EXCEPTION' || !order.exceptionFromStatus) throw new OrderWorkflowError('Order has no recoverable exception', 409);
    assertOrderTransition('EXCEPTION', order.exceptionFromStatus);
    const target = order.exceptionFromStatus;
    const updated = await tx.order.update({
      where: { id: order.id, version: order.version },
      data: { status: target, exceptionFromStatus: null, exceptionCode: null, exceptionMessage: null, version: { increment: 1 } },
    });
    await appendOrderEventTx(tx, {
      orderId, eventType: 'ORDER_RECOVERED', source: ctx.source, ...actorFields(actor, actorRole),
      fromStatus: 'EXCEPTION', toStatus: target, idempotencyKey, requestId: ctx.requestId, data: { note: note || null },
    });
    return getOrder(updated.id, tx);
  }, { isolationLevel: 'Serializable' });
}

async function getOrder(orderId, client = prisma) {
  return client.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: { include: { menuItem: true, inventoryReservations: true } },
      refunds: { orderBy: { createdAt: 'asc' } },
      events: { orderBy: { sequence: 'asc' } },
      providerEvents: { orderBy: { createdAt: 'asc' } },
    },
  });
}

module.exports = {
  OrderWorkflowError,
  applyDeliveryEvidence,
  applyPaymentEvidence,
  cancelOrder,
  createReservedOrder,
  fulfillOrder,
  getOrder,
  markOrderException,
  reconcilePayment,
  recoverOrder,
  refundOrder,
  transitionOrder,
};
