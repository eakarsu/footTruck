const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { initializeWebSocket } = require('./services/websocket');
const { initialize: initAutoPostScheduler } = require('./services/autoPostScheduler');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/validate');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const authRoutes = require('./routes/auth');
const truckRoutes = require('./routes/trucks');
const locationRoutes = require('./routes/locations');
const menuRoutes = require('./routes/menus');
const orderRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const socialRoutes = require('./routes/social');
const financialRoutes = require('./routes/financial');
const eventRoutes = require('./routes/events');
const permitRoutes = require('./routes/permits');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const gpsRoutes = require('./routes/gps');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
const io = initializeWebSocket(server);
app.set('io', io);

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global input sanitization
app.use(sanitizeInput);

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/permits', permitRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/gps', gpsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('WebSocket server initialized');

  // Initialize auto-post scheduler for social media
  initAutoPostScheduler();
  console.log('Auto-post scheduler initialized');
});

module.exports = { app, server, io };
