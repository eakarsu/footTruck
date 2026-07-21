const express = require('express');
const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');
const { requireConfig } = require('../lib/secrets');
const { validateProviderEvidence, verifyProviderWebhook } = require('../providers/commerceProvider');
const {
  OrderWorkflowError,
  applyDeliveryEvidence,
  applyPaymentEvidence,
  refundOrder,
} = require('../services/orderService');

const router = express.Router();

router.post('/:provider', async (req, res) => {
  try {
    const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(req.body);
    const secret = requireConfig('COMMERCE_WEBHOOK_SECRET', { minimumLength: 32 });
    if (!verifyProviderWebhook(rawBody, req.get('x-commerce-signature'), secret)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    if (!req.body || req.body.provider !== req.params.provider || !['PAYMENT', 'REFUND', 'DELIVERY'].includes(req.body.operation)) {
      return res.status(400).json({ error: 'Webhook provider or operation is invalid' });
    }
    const order = await prisma.order.findUnique({ where: { id: req.body.orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const evidence = validateProviderEvidence(req.body, { sourceOrderRef: order.orderNumber });
    const common = {
      orderId: order.id,
      evidence,
      idempotencyKey: `webhook:${evidence.provider}:${evidence.eventId}`,
      context: { requestId: req.get('x-request-id') || randomUUID(), source: 'PROVIDER_WEBHOOK' },
      direction: 'INBOUND_WEBHOOK',
      actorRole: 'PROVIDER',
    };
    let result;
    if (req.body.operation === 'PAYMENT') result = await applyPaymentEvidence(common);
    if (req.body.operation === 'DELIVERY') result = await applyDeliveryEvidence(common);
    if (req.body.operation === 'REFUND') {
      result = await refundOrder({
        ...common,
        amountCents: req.body.result.amountCents,
        reason: req.body.result.reason || 'Provider-initiated refund',
      });
    }
    return res.json(JSON.parse(JSON.stringify({ received: true, result }, (_, item) => typeof item === 'bigint' ? item.toString() : item)));
  } catch (error) {
    if (error instanceof OrderWorkflowError) return res.status(error.status).json({ error: error.message, code: error.code });
    console.error('Commerce webhook error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Webhook processing failed' });
  }
});

module.exports = router;
