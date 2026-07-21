const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { sha256 } = require('../lib/canonical');
const { requireConfig } = require('../lib/secrets');
const { assertOrderAccess, assertTruckAccess } = require('../middleware/truckAccess');

let io = null;

function initializeWebSocket(server) {
  const origins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  io = new Server(server, {
    cors: {
      origin: origins,
      methods: ['GET', 'POST']
    }
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next();
    try {
      const revoked = await prisma.tokenBlacklist.findUnique({ where: { token: sha256(token) } });
      if (revoked) throw new Error('revoked');
      const decoded = jwt.verify(token, requireConfig('JWT_SECRET', { minimumLength: 32 }));
      socket.user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!socket.user) throw new Error('unknown identity');
      return next();
    } catch {
      return next(new Error('Invalid session'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join truck-specific room for location updates
    socket.on('subscribe-truck', (truckId) => {
      socket.join(`truck-${truckId}`);
      console.log(`Client ${socket.id} subscribed to truck ${truckId}`);
    });

    // Leave truck room
    socket.on('unsubscribe-truck', (truckId) => {
      socket.leave(`truck-${truckId}`);
      console.log(`Client ${socket.id} unsubscribed from truck ${truckId}`);
    });

    // Join area-based room for nearby notifications
    socket.on('subscribe-area', (data = {}) => {
      const { latitude, longitude, radius } = data;
      if (![latitude, longitude].every(Number.isFinite) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        socket.emit('operation-error', { code: 'INVALID_LOCATION' });
        return;
      }
      // Create a grid-based room name for nearby notifications
      const gridLat = Math.floor(latitude * 10) / 10;
      const gridLon = Math.floor(longitude * 10) / 10;
      const areaRoom = `area-${gridLat}-${gridLon}`;
      socket.join(areaRoom);
      socket.areaRoom = areaRoom;
      socket.userLocation = { latitude, longitude, radius: radius || 5 };
      console.log(`Client ${socket.id} subscribed to area ${areaRoom}`);
    });

    // Broadcast location update from truck owner
    socket.on('broadcast-location', async (data = {}) => {
      if (!socket.user) {
        socket.emit('operation-error', { code: 'AUTHENTICATION_REQUIRED' });
        return;
      }

      const { truckId, latitude, longitude, heading, speed } = data;
      try {
        await assertTruckAccess(socket.user, truckId, 'OPERATOR');
        if (![latitude, longitude].every(Number.isFinite) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new Error('invalid location');
      } catch {
        socket.emit('operation-error', { code: 'LOCATION_BROADCAST_DENIED' });
        return;
      }

      // Emit to all clients subscribed to this truck
      io.to(`truck-${truckId}`).emit('location-update', {
        truckId,
        latitude,
        longitude,
        heading,
        speed,
        timestamp: new Date().toISOString()
      });

      // Emit to nearby area rooms
      const gridLat = Math.floor(latitude * 10) / 10;
      const gridLon = Math.floor(longitude * 10) / 10;

      // Emit to surrounding grid cells
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const areaRoom = `area-${(gridLat + i * 0.1).toFixed(1)}-${(gridLon + j * 0.1).toFixed(1)}`;
          io.to(areaRoom).emit('truck-nearby', {
            truckId,
            latitude,
            longitude
          });
        }
      }
    });

    // Handle order status updates
    socket.on('join-order', async (orderNumber) => {
      if (!socket.user || typeof orderNumber !== 'string') {
        socket.emit('operation-error', { code: 'ORDER_SUBSCRIPTION_DENIED' });
        return;
      }
      try {
        const order = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } });
        if (!order) throw new Error('not found');
        await assertOrderAccess(socket.user, order.id, 'VIEWER');
        socket.join(`order-${orderNumber}`);
      } catch {
        socket.emit('operation-error', { code: 'ORDER_SUBSCRIPTION_DENIED' });
      }
    });

    socket.on('leave-order', (orderNumber) => {
      socket.leave(`order-${orderNumber}`);
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

// Utility functions for emitting events
function emitLocationUpdate(truckId, locationData) {
  if (io) {
    io.to(`truck-${truckId}`).emit('location-update', {
      truckId,
      ...locationData,
      timestamp: new Date().toISOString()
    });
  }
}

function emitOrderUpdate(orderNumber, orderData) {
  if (io) {
    io.to(`order-${orderNumber}`).emit('order-update', orderData);
  }
}

function emitToTruckOwner(truckId, event, data) {
  if (io) {
    io.to(`owner-${truckId}`).emit(event, data);
  }
}

module.exports = {
  initializeWebSocket,
  getIO,
  emitLocationUpdate,
  emitOrderUpdate,
  emitToTruckOwner
};
