import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

const organizationUploadsPath = path.join(process.cwd(), 'uploads', 'organizations');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(organizationUploadsPath, { recursive: true });
      cb(null, organizationUploadsPath);
    } catch (error) {
      cb(error, organizationUploadsPath);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    const extension = path.extname(sanitizedOriginalName) || '.png';
    const baseName = path.basename(sanitizedOriginalName, extension);
    cb(null, `org-${timestamp}-${baseName}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed for organization photo'));
    }
    cb(null, true);
  }
});

const handleUpload = (req, res, next) => {
  upload.single('organizationLogo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('phone').isMobilePhone('any'),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('organizationName').trim().notEmpty(),
  body('organizationPhone').optional({ checkFalsy: true }).isMobilePhone('any'),
  body('addressStreet').optional({ checkFalsy: true }).isString().trim(),
  body('addressCity').optional({ checkFalsy: true }).isString().trim(),
  body('addressState').optional({ checkFalsy: true }).isString().trim(),
  body('addressZip').optional({ checkFalsy: true }).isString().trim(),
  body('addressCountry').optional({ checkFalsy: true }).isString().trim(),
  body('gstNumber').optional({ checkFalsy: true }).isString().trim(),
  body('taxRate').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('taxInclusive').optional({ checkFalsy: true }).isBoolean(),
  body('currency').optional({ checkFalsy: true }).isString().trim(),
  body('timezone').optional({ checkFalsy: true }).isString().trim()
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
router.post('/register', handleUpload, registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);
router.post('/verify-email', verifyEmail);
router.post('/verify-phone', verifyPhone);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;

