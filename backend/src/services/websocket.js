const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware for WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
      } catch (err) {
        // Token invalid, but allow connection for public features
        socket.user = null;
      }
    }
    next();
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
    socket.on('subscribe-area', (data) => {
      const { latitude, longitude, radius } = data;
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
    socket.on('broadcast-location', (data) => {
      if (!socket.user) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const { truckId, latitude, longitude, heading, speed } = data;

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
    socket.on('join-order', (orderNumber) => {
      socket.join(`order-${orderNumber}`);
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
