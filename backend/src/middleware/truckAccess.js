const prisma = require('../lib/prisma');
const { sha256 } = require('../lib/canonical');

const ACCESS_RANK = Object.freeze({ VIEWER: 1, OPERATOR: 2, MANAGER: 3 });

class AccessError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = 'AccessError';
    this.status = status;
  }
}

async function truckAccessFor(user, truckId) {
  if (!user) return null;
  const truck = await prisma.truck.findUnique({
    where: { id: truckId },
    select: {
      id: true,
      ownerId: true,
      memberships: { where: { userId: user.id, isActive: true }, select: { role: true } },
    },
  });
  if (!truck) throw new AccessError('Truck not found', 404);
  if (user.role === 'ADMIN' || truck.ownerId === user.id) return 'MANAGER';
  return truck.memberships[0]?.role || null;
}

async function assertTruckAccess(user, truckId, required = 'VIEWER') {
  const role = await truckAccessFor(user, truckId);
  if (!role || ACCESS_RANK[role] < ACCESS_RANK[required]) throw new AccessError('Insufficient truck permissions');
  return role;
}

async function assertOrderAccess(user, orderId, required = 'VIEWER') {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { truckId: true } });
  if (!order) throw new AccessError('Order not found', 404);
  const role = await assertTruckAccess(user, order.truckId, required);
  return { order, role };
}

function assertCustomerOrderAccess(order, token) {
  if (!order.customerAccessTokenHash || !token || sha256(token) !== order.customerAccessTokenHash) {
    throw new AccessError('Order access token is invalid', 403);
  }
}

function requireTruckAccess(required, truckIdFromRequest = (req) => req.params.truckId || req.body.truckId) {
  return async (req, res, next) => {
    try {
      req.truckRole = await assertTruckAccess(req.user, truckIdFromRequest(req), required);
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  AccessError,
  assertCustomerOrderAccess,
  assertOrderAccess,
  assertTruckAccess,
  requireTruckAccess,
  truckAccessFor,
};
