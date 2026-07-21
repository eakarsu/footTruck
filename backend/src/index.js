const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { initializeWebSocket } = require('./services/websocket');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/validate');
const { authenticate } = require('./middleware/auth');
const { requireConfig } = require('./lib/secrets');
const prisma = require('./lib/prisma');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function allowedOrigins() {
  return (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
}

function createApplication() {
  const app = express();
  const server = http.createServer(app);
  const io = initializeWebSocket(server);
  app.set('io', io);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const allowlist = allowedOrigins();
      return allowlist.includes(origin) ? callback(null, true) : callback(new Error('Origin is not allowed'));
    },
    credentials: true,
  }));
  app.use(express.json({
    limit: '1mb',
    verify(req, _res, buffer) { req.rawBody = Buffer.from(buffer); },
  }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  // Provider payloads are verified byte-for-byte and must not be transformed
  // by generic form sanitizers before evidence validation.
  app.use('/api/commerce/webhooks', require('./routes/commerceWebhooks'));
  app.use(sanitizeInput);
  app.use('/api/', apiLimiter);
  app.use('/api/auth', authLimiter, require('./routes/auth'));
  app.use('/api/trucks', require('./routes/trucks'));
  app.use('/api/locations', require('./routes/locations'));
  app.use('/api/menus', require('./routes/menus'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/inventory', authenticate, require('./routes/inventory'));
  app.use('/api/financial', require('./routes/financial'));
  app.use('/api/events', require('./routes/events'));
  app.use('/api/permits', require('./routes/permits'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/gps', require('./routes/gps'));

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.set('Cache-Control', 'no-store').json({ status: 'ok', database: 'ok' });
    } catch {
      res.set('Cache-Control', 'no-store').status(503).json({ status: 'unavailable', database: 'unavailable' });
    }
  });

  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((error, _req, res, _next) => {
    if (!error.status || error.status >= 500) console.error(error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Internal server error' });
  });

  return { app, server, io };
}

async function start() {
  requireConfig('DATABASE_URL');
  requireConfig('JWT_SECRET', { minimumLength: 32 });
  requireConfig('CUSTOMER_TOKEN_SECRET', { minimumLength: 32 });
  const origins = requireConfig('CORS_ALLOWED_ORIGINS').split(',').map((origin) => origin.trim());
  if (origins.some((origin) => origin === '*')) throw new Error('Wildcard CORS is forbidden');
  if (process.env.NODE_ENV === 'test') {
    const schema = await prisma.$queryRaw`SELECT to_regclass('public."OrderEvent"') IS NOT NULL AS applied`;
    if (!schema[0]?.applied) throw new Error('Required disposable test schema is not applied');
  } else {
    const applied = await prisma.$queryRaw`SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    if (!applied[0]?.count) throw new Error('Required database migration is not applied; run migrate.sh as an explicit release step');
  }
  const { server } = createApplication();
  const port = Number(process.env.PORT || 4000);
  server.listen(port, () => console.log(`Food truck operations server listening on port ${port}`));
  return server;
}

if (require.main === module) start().catch(async (error) => {
  console.error(error.message);
  await prisma.$disconnect().catch(() => undefined);
  process.exitCode = 1;
});

module.exports = { createApplication, start };
