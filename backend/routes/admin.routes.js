import express from 'express';
import { getProfile, updateProfile, getAccountPlan } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Only owner/manager can access admin profile
router.get('/profile', authorize('owner', 'manager'), getProfile);
router.put('/profile', authorize('owner', 'manager'), updateProfile);
router.get('/account-plan', authorize('owner', 'manager'), getAccountPlan);

export default router;

