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
app.use('/api/event-prep-forecast', require('./routes/eventPrepForecast'));
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api/ai/mobile-push', require('./routes/mobileNotifications')); app.use('/api/ai/vision-food-qa', require('./routes/visionFoodQA')); app.use('/api/ai/dynamic-pricing', require('./routes/dynamicPricing')); app.use('/api/ai/supplier-ordering', require('./routes/supplierOrdering')); app.use('/api/ai/crew-scheduling', require('./routes/crewScheduling')); app.use('/api/ai/voice-ordering', require('./routes/voiceOrdering')); app.use('/api/ai/loyalty', require('./routes/loyaltyAI'));

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

// === Batch 10 Gaps & Frontend Mounts === (mounts)
app.use('/api/gap-no-vision-based-food-plating-qa', require('./routes/gap_no_vision_based_food_plating_qa'));
app.use('/api/gap-no-dynamic-pricing-ai-despite-demand', require('./routes/gap_no_dynamic_pricing_ai_despite_demand'));
app.use('/api/gap-no-supplier-sourcing-optimization', require('./routes/gap_no_supplier_sourcing_optimization'));
app.use('/api/gap-no-predictive-equipment-maintenance', require('./routes/gap_no_predictive_equipment_maintenance'));
app.use('/api/gap-no-crew-scheduling-optimization', require('./routes/gap_no_crew_scheduling_optimization'));
app.use('/api/gap-no-voice-ordering-agent', require('./routes/gap_no_voice_ordering_agent'));
app.use('/api/gap-no-customer-loyalty-churn-ai', require('./routes/gap_no_customer_loyalty_churn_ai'));
app.use('/api/gap-no-payment-stripe-integration-in-the', require('./routes/gap_no_payment_stripe_integration_in_the'));
app.use('/api/gap-no-customer-mobile-app-web-only', require('./routes/gap_no_customer_mobile_app_web_only'));
app.use('/api/gap-no-loyalty-rewards-backend', require('./routes/gap_no_loyalty_rewards_backend'));
app.use('/api/gap-no-crew-scheduling-module', require('./routes/gap_no_crew_scheduling_module'));
app.use('/api/gap-no-supplier-vendor-procurement-module', require('./routes/gap_no_supplier_vendor_procurement_module'));
app.use('/api/gap-no-webhooks-for-partners-doordash-drive', require('./routes/gap_no_webhooks_for_partners_doordash_drive'));
app.use('/api/gap-no-emergency-incident-reporting', require('./routes/gap_no_emergency_incident_reporting'));
app.use('/api/gap-no-real-time-order-tracking-sockets', require('./routes/gap_no_real_time_order_tracking_sockets'));
