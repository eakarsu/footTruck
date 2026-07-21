const { createHmac, randomBytes, randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../../src/lib/prisma');
const { digestJson } = require('../../src/lib/canonical');
const { assertOrderAccess, assertTruckAccess, AccessError } = require('../../src/middleware/truckAccess');
const { validateProviderEvidence } = require('../../src/providers/commerceProvider');
const { verifyOrderAuditChain } = require('../../src/services/orderAudit');
const {
  applyPaymentEvidence,
  cancelOrder,
  createReservedOrder,
  fulfillOrder,
  recoverOrder,
  refundOrder,
  transitionOrder,
} = require('../../src/services/orderService');
const { createApplication } = require('../../src/index');

process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.CUSTOMER_TOKEN_SECRET = randomBytes(32).toString('hex');
process.env.COMMERCE_WEBHOOK_SECRET = randomBytes(32).toString('hex');
process.env.CORS_ALLOWED_ORIGINS = 'http://127.0.0.1:3000';

function evidence({ provider, eventId, sourceOrderRef, status = 'SUCCEEDED', result }) {
  return validateProviderEvidence({
    licensed: true,
    provider,
    eventId,
    sourceTimestamp: new Date().toISOString(),
    sourceOrderRef,
    status,
    result,
  });
}

test('commerce order workflow is idempotent, scoped, auditable, and failure-safe', async (suite) => {
  const suffix = randomUUID();
  const owner = await prisma.user.create({ data: { email: `owner-${suffix}@test.invalid`, password: 'unused', name: 'Owner', role: 'OWNER', emailVerified: true } });
  const operator = await prisma.user.create({ data: { email: `operator-${suffix}@test.invalid`, password: 'unused', name: 'Operator', role: 'EMPLOYEE', emailVerified: true } });
  const outsider = await prisma.user.create({ data: { email: `outsider-${suffix}@test.invalid`, password: 'unused', name: 'Outsider', role: 'EMPLOYEE', emailVerified: true } });
  const truck = await prisma.truck.create({ data: { name: `Workflow truck ${suffix}`, ownerId: owner.id } });
  const membership = await prisma.truckMembership.create({ data: { truckId: truck.id, userId: operator.id, role: 'OPERATOR' } });
  const menu = await prisma.menu.create({ data: { name: 'Evidence menu', truckId: truck.id } });
  const category = await prisma.menuCategory.create({ data: { name: 'Mains', menuId: menu.id } });
  const menuItem = await prisma.menuItem.create({ data: { name: 'Measured meal', price: 12.5, categoryId: category.id, allergens: [], tags: [] } });
  const inventory = await prisma.inventoryItem.create({
    data: { name: 'Portioned ingredient', category: 'PRODUCE', quantity: 30, unit: 'portion', minQuantity: 4, truckId: truck.id },
  });
  await prisma.menuItemIngredient.create({ data: { menuItemId: menuItem.id, inventoryItemId: inventory.id, quantityPerItem: 2 } });
  const input = {
    truckId: truck.id,
    idempotencyKey: `create-${suffix}`,
    type: 'WALK_IN',
    customerName: 'Workflow Customer',
    items: [{ menuItemId: menuItem.id, quantity: 2 }],
  };
  const tax = evidence({ provider: 'licensed-tax', eventId: `tax-${suffix}`, sourceOrderRef: input.idempotencyKey, result: { taxCents: 100 } });
  const context = { requestId: randomUUID(), source: 'INTEGRATION_TEST' };
  let order;

  await suite.test('operator scope is explicit and revocation takes effect immediately', async () => {
    assert.equal(await assertTruckAccess(operator, truck.id, 'OPERATOR'), 'OPERATOR');
    await assert.rejects(() => assertTruckAccess(outsider, truck.id, 'VIEWER'), AccessError);
    await prisma.truckMembership.update({ where: { id: membership.id }, data: { isActive: false } });
    await assert.rejects(() => assertTruckAccess(operator, truck.id, 'VIEWER'), AccessError);
    await prisma.truckMembership.update({ where: { id: membership.id }, data: { isActive: true } });
  });

  await suite.test('truck and menu APIs enforce membership roles and expose assigned trucks', async () => {
    const { server } = createApplication();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
    const tokenFor = (user) => jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const request = (path, user, options = {}) => fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { authorization: `Bearer ${tokenFor(user)}`, 'content-type': 'application/json', ...options.headers },
    });
    try {
      const trucksResponse = await request('/trucks', operator);
      assert.equal(trucksResponse.status, 200);
      const assigned = await trucksResponse.json();
      assert.equal(assigned.some((candidate) => candidate.id === truck.id && candidate.accessRole === 'OPERATOR'), true);
      assert.equal((await request(`/menus/truck/${truck.id}`, outsider)).status, 403);
      assert.equal((await request(`/menus/${menu.id}`, operator, { method: 'PUT', body: JSON.stringify({ name: 'Forbidden update' }) })).status, 403);
      assert.equal((await request(`/menus/items/${menuItem.id}/soldout`, operator, { method: 'PATCH', body: '{}' })).status, 200);
      assert.equal((await request(`/menus/items/${menuItem.id}/soldout`, operator, { method: 'PATCH', body: '{}' })).status, 200);
      await prisma.truckMembership.update({ where: { id: membership.id }, data: { isActive: false } });
      assert.equal((await request(`/menus/truck/${truck.id}`, operator)).status, 403);
      await prisma.truckMembership.update({ where: { id: membership.id }, data: { isActive: true } });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await suite.test('order creation reserves real inventory and exact replay is idempotent', async () => {
    order = await createReservedOrder({ input, taxEvidence: tax, actor: operator, actorRole: 'OPERATOR', context });
    assert.equal(order.status, 'RESERVED');
    assert.equal(order.subtotalCents, 2500);
    assert.equal(order.taxCents, 100);
    assert.match(order.customerAccessToken, /^[a-f0-9]{64}$/);
    assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventory.id } })).quantity, 26);
    const replay = await createReservedOrder({ input, taxEvidence: tax, actor: operator, actorRole: 'OPERATOR', context });
    assert.equal(replay.id, order.id);
    assert.equal(replay.customerAccessToken, order.customerAccessToken);
    assert.equal(await prisma.inventoryMovement.count({ where: { referenceId: order.id } }), 1);
    assert.equal(await verifyOrderAuditChain(order.id), true);
  });

  await suite.test('altered idempotent request and overselling both roll back', async () => {
    await assert.rejects(() => createReservedOrder({
      input: { ...input, customerName: 'Altered' }, taxEvidence: tax, actor: operator, actorRole: 'OPERATOR', context,
    }), /different request/);
    await prisma.inventoryItem.update({ where: { id: inventory.id }, data: { quantity: 1 } });
    const oversellKey = `oversell-${suffix}`;
    const oversellTax = evidence({ provider: 'licensed-tax', eventId: `oversell-tax-${suffix}`, sourceOrderRef: oversellKey, result: { taxCents: 50 } });
    await assert.rejects(() => createReservedOrder({
      input: { ...input, idempotencyKey: oversellKey, items: [{ menuItemId: menuItem.id, quantity: 1 }] },
      taxEvidence: oversellTax, actor: operator, actorRole: 'OPERATOR', context,
    }), /Insufficient inventory/);
    assert.equal(await prisma.order.count({ where: { idempotencyKey: oversellKey } }), 0);
    assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventory.id } })).quantity, 1);
    await prisma.inventoryItem.update({ where: { id: inventory.id }, data: { quantity: 26 } });
  });

  await suite.test('payment failure is terminal until explicit recovery and provider replay cannot alter evidence', async () => {
    const failed = evidence({
      provider: 'licensed-payments', eventId: `payment-failed-${suffix}`, sourceOrderRef: order.orderNumber, status: 'FAILED',
      result: { paymentIntentId: `pi-${suffix}`, failureCode: 'DECLINED', failureReason: 'Issuer declined' },
    });
    let failedOrder = await applyPaymentEvidence({ orderId: order.id, evidence: failed, idempotencyKey: `pay-fail-${suffix}`, direction: 'INBOUND_WEBHOOK', context });
    assert.equal(failedOrder.status, 'EXCEPTION');
    assert.equal(failedOrder.paymentStatus, 'FAILED');
    failedOrder = await applyPaymentEvidence({ orderId: order.id, evidence: failed, idempotencyKey: `pay-fail-${suffix}`, direction: 'INBOUND_WEBHOOK', context });
    assert.equal(failedOrder.status, 'EXCEPTION');
    await assert.rejects(() => applyPaymentEvidence({
      orderId: order.id,
      evidence: { ...failed, payloadDigest: digestJson({ altered: true }) },
      idempotencyKey: `pay-fail-${suffix}`,
      direction: 'INBOUND_WEBHOOK',
      context,
    }), /altered evidence/);
    const recovered = await recoverOrder({ orderId: order.id, idempotencyKey: `recover-${suffix}`, note: 'Customer supplied a different tender', actor: owner, actorRole: 'MANAGER', context });
    assert.equal(recovered.status, 'RESERVED');
  });

  await suite.test('successful retry, partial fulfillment, and pickup preserve every transition', async () => {
    const paid = evidence({
      provider: 'licensed-payments', eventId: `payment-ok-${suffix}`, sourceOrderRef: order.orderNumber,
      result: { paymentIntentId: `pi-ok-${suffix}` },
    });
    let current = await applyPaymentEvidence({ orderId: order.id, evidence: paid, idempotencyKey: `pay-ok-${suffix}`, actor: operator, actorRole: 'OPERATOR', context });
    assert.equal(current.status, 'CONFIRMED');
    current = await transitionOrder({ orderId: order.id, toStatus: 'PREPARING', eventType: 'PREPARATION_STARTED', idempotencyKey: `prep-${suffix}`, actor: operator, actorRole: 'OPERATOR', context });
    const itemId = current.items[0].id;
    current = await fulfillOrder({ orderId: order.id, quantities: [{ orderItemId: itemId, quantity: 1 }], idempotencyKey: `partial-${suffix}`, actor: operator, actorRole: 'OPERATOR', context });
    assert.equal(current.status, 'PARTIALLY_FULFILLED');
    assert.equal(current.fulfillmentStatus, 'PARTIAL');
    current = await fulfillOrder({ orderId: order.id, quantities: [{ orderItemId: itemId, quantity: 1 }], idempotencyKey: `full-${suffix}`, actor: operator, actorRole: 'OPERATOR', context });
    assert.equal(current.status, 'READY');
    current = await transitionOrder({ orderId: order.id, toStatus: 'PICKED_UP', eventType: 'ORDER_PICKED_UP', idempotencyKey: `pickup-${suffix}`, actor: operator, actorRole: 'OPERATOR', context });
    assert.equal(current.status, 'PICKED_UP');
    assert.equal(await verifyOrderAuditChain(order.id), true);
  });

  await suite.test('unpaid cancellation releases inventory exactly once', async () => {
    const key = `cancel-create-${suffix}`;
    const cancelTax = evidence({ provider: 'licensed-tax', eventId: `cancel-tax-${suffix}`, sourceOrderRef: key, result: { taxCents: 80 } });
    const cancellable = await createReservedOrder({
      input: { ...input, idempotencyKey: key, items: [{ menuItemId: menuItem.id, quantity: 1 }] },
      taxEvidence: cancelTax, actor: operator, actorRole: 'OPERATOR', context,
    });
    const beforeCancel = (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventory.id } })).quantity;
    const cancelled = await cancelOrder({ orderId: cancellable.id, reason: 'Customer request', idempotencyKey: `cancel-${suffix}`, actor: operator, actorRole: 'OPERATOR', context });
    assert.equal(cancelled.status, 'CANCELLED');
    assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventory.id } })).quantity, beforeCancel + 2);
    await cancelOrder({ orderId: cancellable.id, reason: 'Customer request', idempotencyKey: `cancel-${suffix}`, actor: operator, actorRole: 'OPERATOR', context });
    assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventory.id } })).quantity, beforeCancel + 2);
  });

  await suite.test('partial and full refunds are provider-bound and over-refund is rejected', async () => {
    const key = `refund-create-${suffix}`;
    const refundTax = evidence({ provider: 'licensed-tax', eventId: `refund-tax-${suffix}`, sourceOrderRef: key, result: { taxCents: 100 } });
    const refundable = await createReservedOrder({ input: { ...input, idempotencyKey: key, items: [{ menuItemId: menuItem.id, quantity: 1 }] }, taxEvidence: refundTax, actor: operator, actorRole: 'OPERATOR', context });
    const paid = evidence({ provider: 'licensed-payments', eventId: `refund-payment-${suffix}`, sourceOrderRef: refundable.orderNumber, result: { paymentIntentId: `refund-pi-${suffix}` } });
    const paidOrder = await applyPaymentEvidence({ orderId: refundable.id, evidence: paid, idempotencyKey: `refund-payment-${suffix}`, actor: operator, actorRole: 'OPERATOR', context });
    const partialEvidence = evidence({ provider: 'licensed-payments', eventId: `partial-refund-${suffix}`, sourceOrderRef: refundable.orderNumber, result: { refundId: `refund-part-${suffix}` } });
    let result = await refundOrder({ orderId: refundable.id, amountCents: 500, reason: 'Missing component', evidence: partialEvidence, idempotencyKey: `partial-refund-${suffix}`, actor: owner, actorRole: 'MANAGER', context });
    assert.equal(result.order.paymentStatus, 'PARTIALLY_REFUNDED');
    await assert.rejects(() => refundOrder({ orderId: refundable.id, amountCents: paidOrder.totalCents, reason: 'Too much', evidence: evidence({ provider: 'licensed-payments', eventId: `over-refund-${suffix}`, sourceOrderRef: refundable.orderNumber, result: { refundId: `over-${suffix}` } }), idempotencyKey: `over-refund-${suffix}`, actor: owner, actorRole: 'MANAGER', context }), /exceeds captured/);
    const remaining = paidOrder.totalCents - 500;
    result = await refundOrder({ orderId: refundable.id, amountCents: remaining, reason: 'Order cancelled', evidence: evidence({ provider: 'licensed-payments', eventId: `full-refund-${suffix}`, sourceOrderRef: refundable.orderNumber, result: { refundId: `full-${suffix}` } }), idempotencyKey: `full-refund-${suffix}`, actor: owner, actorRole: 'MANAGER', context });
    assert.equal(result.order.paymentStatus, 'REFUNDED');
    const cancelled = await cancelOrder({ orderId: refundable.id, reason: 'Refund complete', idempotencyKey: `refund-cancel-${suffix}`, actor: owner, actorRole: 'MANAGER', context });
    assert.equal(cancelled.status, 'CANCELLED');
  });

  await suite.test('signed webhook processing is idempotent and rejects altered duplicate events', async () => {
    const key = `webhook-create-${suffix}`;
    const webhookTax = evidence({ provider: 'licensed-tax', eventId: `webhook-tax-${suffix}`, sourceOrderRef: key, result: { taxCents: 70 } });
    const webhookOrder = await createReservedOrder({ input: { ...input, idempotencyKey: key, items: [{ menuItemId: menuItem.id, quantity: 1 }] }, taxEvidence: webhookTax, actor: operator, actorRole: 'OPERATOR', context });
    const { server } = createApplication();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const payload = {
      licensed: true,
      provider: 'licensed-partner',
      operation: 'PAYMENT',
      orderId: webhookOrder.id,
      eventId: `webhook-payment-${suffix}`,
      sourceTimestamp: new Date().toISOString(),
      sourceOrderRef: webhookOrder.orderNumber,
      status: 'FAILED',
      result: { paymentIntentId: `webhook-pi-${suffix}`, failureCode: 'DECLINED' },
    };
    const send = async (body) => {
      const raw = JSON.stringify(body);
      return fetch(`http://127.0.0.1:${port}/api/commerce/webhooks/${body.provider}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-commerce-signature': createHmac('sha256', process.env.COMMERCE_WEBHOOK_SECRET).update(raw).digest('hex'),
        },
        body: raw,
      });
    };
    try {
      assert.equal((await send(payload)).status, 200);
      assert.equal((await send(payload)).status, 200);
      assert.equal((await send({ ...payload, result: { ...payload.result, failureCode: 'ALTERED' } })).status, 409);
      assert.equal(await prisma.orderProviderEvent.count({ where: { provider: payload.provider, providerEventId: payload.eventId } }), 1);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await suite.test('database triggers reject audit, provider, refund, inventory, and invalid state tampering', async () => {
    const event = await prisma.orderEvent.findFirstOrThrow({ where: { orderId: order.id } });
    const providerEvent = await prisma.orderProviderEvent.findFirstOrThrow({ where: { orderId: order.id } });
    const movement = await prisma.inventoryMovement.findFirstOrThrow({ where: { referenceId: order.id } });
    const refund = await prisma.refund.findFirstOrThrow({ where: { order: { truckId: truck.id } } });
    await assert.rejects(() => prisma.orderEvent.update({ where: { id: event.id }, data: { eventType: 'TAMPERED' } }));
    await assert.rejects(() => prisma.orderProviderEvent.delete({ where: { id: providerEvent.id } }));
    await assert.rejects(() => prisma.inventoryMovement.update({ where: { id: movement.id }, data: { reason: 'TAMPERED' } }));
    await assert.rejects(() => prisma.refund.delete({ where: { id: refund.id } }));
    await assert.rejects(() => prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', version: { increment: 1 } } }));
    await assert.rejects(() => prisma.order.delete({ where: { id: order.id } }));
    assert.equal(await verifyOrderAuditChain(order.id), true);
  });

  await suite.test('order detail access follows truck role scope', async () => {
    assert.equal((await assertOrderAccess(operator, order.id, 'VIEWER')).role, 'OPERATOR');
    await assert.rejects(() => assertOrderAccess(outsider, order.id, 'VIEWER'), AccessError);
  });
});
