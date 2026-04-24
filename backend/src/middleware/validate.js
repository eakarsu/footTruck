const { body, query, validationResult } = require('express-validator');

// Middleware to check validation results
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

// Password strength validation rules
const passwordStrength = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
  .matches(/[0-9]/).withMessage('Password must contain at least one number')
  .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character');

// Auth validations
const validateRegister = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  passwordStrength,
  handleValidation
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation
];

const validatePasswordReset = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  handleValidation
];

const validateNewPassword = [
  body('token').notEmpty().withMessage('Reset token is required'),
  passwordStrength,
  handleValidation
];

const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('New password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('New password must contain at least one special character'),
  handleValidation
];

// Generic input sanitization
const sanitizeInput = [
  body('*').trim(),
  (req, res, next) => {
    // Sanitize all string fields in body
    if (req.body && typeof req.body === 'object') {
      for (const key of Object.keys(req.body)) {
        if (typeof req.body[key] === 'string') {
          // Remove potential script tags
          req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
      }
    }
    next();
  }
];

// Pagination validation
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().escape(),
  handleValidation
];

module.exports = {
  handleValidation,
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validateNewPassword,
  validatePasswordChange,
  sanitizeInput,
  validatePagination
};
