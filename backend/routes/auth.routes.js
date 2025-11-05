import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  register,
  login,
  verifyEmail,
  verifyPhone,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  changePassword
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('phone').isMobilePhone('any'),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('organizationName').trim().notEmpty()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Error handler for validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Routes
router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);
router.post('/verify-email', verifyEmail);
router.post('/verify-phone', verifyPhone);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;

