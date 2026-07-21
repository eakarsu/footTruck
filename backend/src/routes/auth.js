const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { validateRegister, validateLogin, validatePasswordReset, validateNewPassword, validatePasswordChange } = require('../middleware/validate');
const prisma = require('../lib/prisma');
const { requireConfig } = require('../lib/secrets');
const { sha256 } = require('../lib/canonical');
const { sendTransactionalEmail } = require('../services/emailProvider');

const router = express.Router();
function issueToken(userId) {
  return jwt.sign({ userId }, requireConfig('JWT_SECRET', { minimumLength: 32 }), { expiresIn: '7d' });
}

function appUrl(pathname, token) {
  const base = new URL(requireConfig('APP_BASE_URL'));
  base.pathname = pathname;
  base.searchParams.set('token', token);
  return base.toString();
}

// Register
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'OWNER',
        emailVerified: false
      }
    });

    // Create email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerification.create({
      data: {
        token: sha256(verificationToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        userId: user.id
      }
    });

    await sendTransactionalEmail({
      to: user.email,
      subject: 'Verify your food truck operations account',
      text: `Verify your email using this link: ${appUrl('/verify-email', verificationToken)}`,
    });
    const token = issueToken(user.id);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified
      },
      token,
      message: 'Registration successful. Please verify your email.'
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = issueToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.decode(token);

    await prisma.tokenBlacklist.create({
      data: {
        token: sha256(token),
        expiresAt: new Date(decoded.exp * 1000)
      }
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Request password reset
router.post('/password-reset/request', validatePasswordReset, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether the email exists
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await prisma.passwordReset.create({
      data: {
        token: sha256(resetToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        userId: user.id
      }
    });

    await sendTransactionalEmail({
      to: user.email,
      subject: 'Reset your food truck operations password',
      text: `Reset your password using this link: ${appUrl('/reset-password', resetToken)}`,
    });
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Confirm password reset
router.post('/password-reset/confirm', validateNewPassword, async (req, res) => {
  try {
    const { token, password } = req.body;

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token: sha256(token) },
      include: { user: true }
    });

    if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword }
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true }
      })
    ]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const verification = await prisma.emailVerification.findUnique({
      where: { token: sha256(token) },
      include: { user: true }
    });

    if (!verification || verification.used || verification.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true }
      }),
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { used: true }
      })
    ]);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Resend verification email
router.post('/resend-verification', authenticate, async (req, res) => {
  try {
    if (req.user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerification.create({
      data: {
        token: sha256(verificationToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        userId: req.user.id
      }
    });

    await sendTransactionalEmail({
      to: req.user.email,
      subject: 'Verify your food truck operations account',
      text: `Verify your email using this link: ${appUrl('/verify-email', verificationToken)}`,
    });
    res.json({ message: 'Verification email sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { trucks: true }
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      trucks: user.trucks
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email }
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authenticate, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Check password strength (utility endpoint)
router.post('/check-password-strength', (req, res) => {
  const { password } = req.body;
  const checks = {
    minLength: password?.length >= 8,
    hasUppercase: /[A-Z]/.test(password || ''),
    hasLowercase: /[a-z]/.test(password || ''),
    hasNumber: /[0-9]/.test(password || ''),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password || '')
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const strength = passed <= 2 ? 'weak' : passed <= 4 ? 'medium' : 'strong';

  res.json({ checks, strength, score: passed });
});

module.exports = router;
