import express from 'express';
import {
  createPayment,
  getPayments,
  getPayment,
  processRazorpayPayment,
  createPaymentLink,
  refundPayment,
  getPaymentStats,
  reconcilePayments
} from '../controllers/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', authorize('owner', 'manager', 'staff'), createPayment);
router.post('/razorpay', authorize('owner', 'manager', 'staff'), processRazorpayPayment);
router.post('/payment-link', authorize('owner', 'manager', 'staff'), createPaymentLink);
router.post('/:paymentId/refund', authorize('owner', 'manager'), refundPayment);
router.get('/', getPayments);
router.get('/stats', getPaymentStats);
router.get('/:paymentId', getPayment);
router.post('/reconcile', authorize('owner', 'manager'), reconcilePayments);

export default router;

