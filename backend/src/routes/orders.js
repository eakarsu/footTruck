const express = require('express');
const { randomUUID } = require('crypto');
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { verifyOrderAuditChain } = require('../services/orderAudit');
const {
  AccessError,
  assertCustomerOrderAccess,
  assertOrderAccess,
  assertTruckAccess,
} = require('../middleware/truckAccess');
const {
  CommerceProviderError,
  callCommerceProvider,
} = require('../providers/commerceProvider');
const {
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
} = require('../services/orderService');
const preOrderService = require('../services/preOrderService');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

const router = express.Router();

function requestContext(req, source = 'API') {
  return { requestId: req.get('x-request-id') || randomUUID(), source };
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item));
}

function idempotencyKey(req) {
  const value = req.get('idempotency-key');
  if (!value || value.length > 200) throw new OrderWorkflowError('A valid Idempotency-Key header is required', 400, 'IDEMPOTENCY_KEY_REQUIRED');
  return value;
}

async function taxEvidenceFor(input, key) {
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: input.items.map((item) => item.menuItemId) } },
    select: { id: true, name: true, price: true, specialPrice: true, isSpecial: true },
  });
  const byId = new Map(menuItems.map((item) => [item.id, item]));
  const lineItems = input.items.map((requested) => {
    const menuItem = byId.get(requested.menuItemId);
    if (!menuItem) throw new OrderWorkflowError('Menu item not found', 400, 'MENU_ITEM_NOT_FOUND');
    const unitPriceCents = Math.round((menuItem.isSpecial && menuItem.specialPrice != null ? menuItem.specialPrice : menuItem.price) * 100);
    return { reference: menuItem.id, description: menuItem.name, quantity: requested.quantity, unitPriceCents };
  });
  return callCommerceProvider('TAX_QUOTE', {
    sourceOrderRef: key,
    idempotencyKey: `tax:${key}`,
    currency: 'USD',
    amountCents: lineItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
    lineItems,
    destination: input.deliveryDestination || null,
    metadata: { truckId: input.truckId, orderType: input.type || 'WALK_IN' },
  });
}

async function handle(handler, req, res) {
  try {
    await handler();
  } catch (error) {
    if (error instanceof AccessError || error instanceof OrderWorkflowError || error instanceof CommerceProviderError) {
      return res.status(error.status || 500).json({ error: error.message, code: error.code });
    }
    console.error('Order route error:', error);
    return res.status(500).json({ error: 'Order workflow failed' });
  }
}

// Customer workflow: access requires both the unguessable order number and the
// deterministic secret token returned only when the idempotent order is created.
router.get('/public/order/:orderNumber', (req, res) => handle(async () => {
  const order = await prisma.order.findUnique({
    where: { orderNumber: req.params.orderNumber },
    include: {
      truck: { select: { name: true, phone: true } },
      items: { select: { quantity: true, fulfilledQuantity: true, menuItem: { select: { name: true } } } },
    },
  });
  if (!order) throw new AccessError('Order not found', 404);
  assertCustomerOrderAccess(order, req.get('x-order-access-token') || req.query.token);
  res.json({
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    scheduledPickup: order.scheduledPickup,
    estimatedReadyTime: order.estimatedReadyTime,
    actualReadyTime: order.actualReadyTime,
    totalCents: order.totalCents,
    currency: order.currency,
    truck: order.truck,
    items: order.items,
    createdAt: order.createdAt,
  });
}, req, res));

router.post('/public/pre-order', (req, res) => handle(async () => {
  const key = idempotencyKey(req);
  const input = { ...req.body, idempotencyKey: key, type: 'PRE_ORDER', pickupWindowId: req.body.slotId };
  if (!input.customerName || (!input.customerPhone && !input.customerEmail)) {
    throw new OrderWorkflowError('Customer name and contact information are required', 400);
  }
  const slot = await prisma.preOrderWindow.findUnique({ where: { id: input.pickupWindowId } });
  if (!slot) throw new OrderWorkflowError('Pickup window not found', 404);
  const scheduledPickup = new Date(slot.date);
  const [hours, minutes] = slot.slotStart.split(':').map(Number);
  scheduledPickup.setHours(hours, minutes, 0, 0);
  input.scheduledPickup = scheduledPickup;
  const taxEvidence = await taxEvidenceFor(input, key);
  const order = await createReservedOrder({ input, taxEvidence, actorRole: 'CUSTOMER', context: requestContext(req, 'CUSTOMER_API') });
  res.status(201).json(jsonSafe(order));
}, req, res));

router.post('/public/order/:orderNumber/cancel', (req, res) => handle(async () => {
  const order = await prisma.order.findUnique({ where: { orderNumber: req.params.orderNumber } });
  if (!order) throw new AccessError('Order not found', 404);
  assertCustomerOrderAccess(order, req.get('x-order-access-token'));
  const cancelled = await cancelOrder({
    orderId: order.id,
    reason: req.body.reason,
    idempotencyKey: idempotencyKey(req),
    actorRole: 'CUSTOMER',
    context: requestContext(req, 'CUSTOMER_API'),
  });
  res.json(jsonSafe(cancelled));
}, req, res));

router.get('/public/truck/:truckId/available-slots', (req, res) => handle(async () => {
  const slots = await preOrderService.getPublicSlots(req.params.truckId, { date: req.query.date, locationId: req.query.locationId });
  res.json(slots);
}, req, res));

router.use(authenticate);

router.get('/truck/:truckId', (req, res) => handle(async () => {
  await assertTruckAccess(req.user, req.params.truckId, 'VIEWER');
  const { page, limit, skip, search } = getPaginationParams(req.query);
  const where = { truckId: req.params.truckId };
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.type = req.query.type;
  if (search) where.OR = [
    { orderNumber: { contains: search, mode: 'insensitive' } },
    { customerName: { contains: search, mode: 'insensitive' } },
  ];
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, include: { items: { include: { menuItem: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.order.count({ where }),
  ]);
  res.json(paginatedResponse(orders, total, page, limit));
}, req, res));

router.get('/truck/:truckId/queue', (req, res) => handle(async () => {
  await assertTruckAccess(req.user, req.params.truckId, 'VIEWER');
  const orders = await prisma.order.findMany({
    where: { truckId: req.params.truckId, status: { in: ['RESERVED', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'PARTIALLY_FULFILLED', 'READY', 'EXCEPTION'] } },
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({
    reserved: orders.filter((order) => order.status === 'RESERVED'),
    paymentPending: orders.filter((order) => order.status === 'PAYMENT_PENDING'),
    confirmed: orders.filter((order) => order.status === 'CONFIRMED'),
    preparing: orders.filter((order) => ['PREPARING', 'PARTIALLY_FULFILLED'].includes(order.status)),
    ready: orders.filter((order) => order.status === 'READY'),
    exceptions: orders.filter((order) => order.status === 'EXCEPTION'),
  });
}, req, res));

router.get('/truck/:truckId/stats/today', (req, res) => handle(async () => {
  await assertTruckAccess(req.user, req.params.truckId, 'VIEWER');
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const orders = await prisma.order.findMany({ where: { truckId: req.params.truckId, createdAt: { gte: start, lte: end } } });
  const completed = orders.filter((order) => order.paymentStatus === 'COMPLETED' && order.status !== 'CANCELLED');
  const revenueCents = completed.reduce((sum, order) => sum + order.totalCents - order.refundedCents, 0);
  res.json({ totalOrders: orders.length, revenueCents, averageOrderCents: completed.length ? Math.round(revenueCents / completed.length) : 0, pickedUp: orders.filter((order) => order.status === 'PICKED_UP').length });
}, req, res));

router.get('/truck/:truckId/pre-order/slots', (req, res) => handle(async () => {
  await assertTruckAccess(req.user, req.params.truckId, 'VIEWER');
  res.json(await preOrderService.getSlotsByTruck(req.params.truckId, req.query));
}, req, res));

router.post('/truck/:truckId/pre-order/generate-slots', (req, res) => handle(async () => {
  await assertTruckAccess(req.user, req.params.truckId, 'MANAGER');
  if (!req.body.truckLocationId) throw new OrderWorkflowError('truckLocationId is required', 400);
  res.status(201).json(await preOrderService.generateTimeSlots(req.body.truckLocationId));
}, req, res));

router.get('/truck/:truckId/pre-order/settings', (req, res) => handle(async () => {
  await assertTruckAccess(req.user, req.params.truckId, 'VIEWER');
  res.json(await preOrderService.getSettings(req.params.truckId));
}, req, res));

router.put('/truck/:truckId/pre-order/settings', (req, res) => handle(async () => {
  await assertTruckAccess(req.user, req.params.truckId, 'MANAGER');
  res.json(await preOrderService.updateSettings(req.params.truckId, req.body));
}, req, res));

router.post('/', (req, res) => handle(async () => {
  const role = await assertTruckAccess(req.user, req.body.truckId, 'OPERATOR');
  const key = idempotencyKey(req);
  const input = { ...req.body, idempotencyKey: key };
  const taxEvidence = await taxEvidenceFor(input, key);
  const order = await createReservedOrder({ input, taxEvidence, actor: req.user, actorRole: role, context: requestContext(req) });
  res.status(201).json(jsonSafe(order));
}, req, res));

router.get('/:id', (req, res) => handle(async () => {
  await assertOrderAccess(req.user, req.params.id, 'VIEWER');
  res.json(jsonSafe(await getOrder(req.params.id)));
}, req, res));

router.post('/:id/payment', (req, res) => handle(async () => {
  const { role } = await assertOrderAccess(req.user, req.params.id, 'OPERATOR');
  const order = await getOrder(req.params.id);
  const key = idempotencyKey(req);
  const evidence = await callCommerceProvider('PAYMENT', {
    sourceOrderRef: order.orderNumber, idempotencyKey: key, currency: order.currency,
    amountCents: order.totalCents - order.refundedCents,
    metadata: { orderId: order.id, paymentMethod: req.body.paymentMethod || order.paymentMethod },
  });
  res.json(jsonSafe(await applyPaymentEvidence({ orderId: order.id, evidence, idempotencyKey: key, actor: req.user, actorRole: role, context: requestContext(req) })));
}, req, res));

router.post('/:id/delivery', (req, res) => handle(async () => {
  const { role } = await assertOrderAccess(req.user, req.params.id, 'OPERATOR');
  const order = await getOrder(req.params.id);
  const key = idempotencyKey(req);
  const evidence = await callCommerceProvider('DELIVERY', {
    sourceOrderRef: order.orderNumber, idempotencyKey: key, currency: order.currency,
    amountCents: order.totalCents, destination: req.body.destination,
    metadata: { orderId: order.id, pickupAt: order.scheduledPickup },
  });
  res.json(jsonSafe(await applyDeliveryEvidence({ orderId: order.id, evidence, idempotencyKey: key, actor: req.user, actorRole: role, context: requestContext(req) })));
}, req, res));

router.post('/:id/start-preparation', (req, res) => handle(async () => {
  const { role } = await assertOrderAccess(req.user, req.params.id, 'OPERATOR');
  res.json(jsonSafe(await transitionOrder({ orderId: req.params.id, toStatus: 'PREPARING', eventType: 'PREPARATION_STARTED', idempotencyKey: idempotencyKey(req), actor: req.user, actorRole: role, context: requestContext(req) })));
}, req, res));

router.post('/:id/fulfillment', (req, res) => handle(async () => {
  const { role } = await assertOrderAccess(req.user, req.params.id, 'OPERATOR');
  res.json(jsonSafe(await fulfillOrder({ orderId: req.params.id, quantities: req.body.quantities, idempotencyKey: idempotencyKey(req), actor: req.user, actorRole: role, context: requestContext(req) })));
}, req, res));

router.post('/:id/pickup', (req, res) => handle(async () => {
  const { role } = await assertOrderAccess(req.user, req.params.id, 'OPERATOR');
  res.json(jsonSafe(await transitionOrder({ orderId: req.params.id, toStatus: 'PICKED_UP', eventType: 'ORDER_PICKED_UP', idempotencyKey: idempotencyKey(req), actor: req.user, actorRole: role, context: requestContext(req) })));
}, req, res));

router.post('/:id/refunds', (req, res) => handle(async () => {
  const { role } = await assertOrderAccess(req.user, req.params.id, 'MANAGER');
  const order = await getOrder(req.params.id);
  const key = idempotencyKey(req);
  const evidence = await callCommerceProvider('REFUND', {
    sourceOrderRef: order.orderNumber, idempotencyKey: key, currency: order.currency,
    amountCents: req.body.amountCents, metadata: { orderId: order.id, reason: req.body.reason },
  });
  res.json(jsonSafe(await refundOrder({ orderId: order.id, amountCents: req.body.amountCents, reason: req.body.reason, evidence, idempotencyKey: key, actor: req.user, actorRole: role, context: requestContext(req) })));
}, req, res));

router.post('/:id/cancel', (req, res) => handle(async () => {
  const { role } = await assertOrderAccess(req.user, req.params.id, 'OPERATOR');
  res.json(jsonSafe(await cancelOrder({ orderId: req.params.id, reason: req.body.reason, idempotencyKey: idempotencyKey(req), actor: req.user, actorRole: role, context: requestContext(req) })));
}, req, res));

router.post('/:id/exceptions', (req, res) => handle(async () => {
  const { role } = await assertOrderAccess(req.user, req.params.id, 'MANAGER');
  res.json(jsonSafe(await markOrderException({ orderId: req.params.id, code: req.body.code, message: req.body.message, idempotencyKey: idempotencyKey(req), actor: req.user, actorRole: role, context: requestContext(req) })));
}, req, res));

router.post('/:id/recover', (req, res) => handle(async () => {
  const { role } = await assertOrderAccess(req.user, req.params.id, 'MANAGER');
  res.json(jsonSafe(await recoverOrder({ orderId: req.params.id, note: req.body.note, idempotencyKey: idempotencyKey(req), actor: req.user, actorRole: role, context: requestContext(req) })));
}, req, res));

router.post('/:id/reconcile', (req, res) => handle(async () => {
  const { role } = await assertOrderAccess(req.user, req.params.id, 'MANAGER');
  const order = await getOrder(req.params.id);
  const key = idempotencyKey(req);
  const evidence = await callCommerceProvider('RECONCILIATION', {
    sourceOrderRef: order.orderNumber, idempotencyKey: key, currency: order.currency,
    amountCents: order.totalCents, metadata: { orderId: order.id, paymentIntentId: order.paymentIntentId },
  });
  res.json(jsonSafe(await reconcilePayment({ orderId: order.id, evidence, idempotencyKey: key, actor: req.user, actorRole: role, context: requestContext(req) })));
}, req, res));

router.get('/:id/audit', (req, res) => handle(async () => {
  await assertOrderAccess(req.user, req.params.id, 'MANAGER');
  const order = await getOrder(req.params.id);
  res.json(jsonSafe({ orderId: order.id, chainValid: await verifyOrderAuditChain(order.id), events: order.events, providerEvents: order.providerEvents, refunds: order.refunds }));
}, req, res));

module.exports = router;
