const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { sha256 } = require('../lib/canonical');
const { requireConfig } = require('../lib/secrets');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted (logged out)
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { token: sha256(token) }
    });

    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, requireConfig('JWT_SECRET', { minimumLength: 32 }));

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticate, requireRole };
