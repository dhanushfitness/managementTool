import express from 'express';
import {
  getDashboardStats,
  getRecentActivities,
  getUpcomingRenewals,
  getPendingPayments,
  getAttendanceToday,
  getQuickStats,
  getDashboardSummary,
  getPaymentCollectedByMode,
  getAdvancePayments
} from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/activities', getRecentActivities);
router.get('/renewals', getUpcomingRenewals);
router.get('/pending-payments', getPendingPayments);
router.get('/attendance-today', getAttendanceToday);
router.get('/quick-stats', getQuickStats);
router.get('/summary', getDashboardSummary);
router.get('/payment-collected', getPaymentCollectedByMode);
router.get('/advance-payments', getAdvancePayments);

export default router;

