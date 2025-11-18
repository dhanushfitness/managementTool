import express from 'express';
import {
  createPayment,
  getPayments,
  getPayment,
  createRazorpayOrder,
  processRazorpayPayment,
  createPaymentLink,
  sendPaymentLinkViaSMS,
  refundPayment,
  getPaymentStats,
  reconcilePayments,
  getReceipts,
  exportReceipts,
  testRazorpayConfig
} from '../controllers/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', authorize('owner', 'manager', 'staff'), createPayment);
router.post('/razorpay/order', authorize('owner', 'manager', 'staff'), createRazorpayOrder);
router.post('/razorpay', authorize('owner', 'manager', 'staff'), processRazorpayPayment);
router.post('/payment-link', authorize('owner', 'manager', 'staff'), createPaymentLink);
router.post('/send-sms', authorize('owner', 'manager', 'staff'), sendPaymentLinkViaSMS);
router.post('/:paymentId/refund', authorize('owner', 'manager'), refundPayment);
router.get('/', getPayments);
router.get('/receipts', getReceipts);
router.get('/receipts/export', exportReceipts);
router.get('/stats', getPaymentStats);
router.get('/razorpay/test', authenticate, authorize('owner', 'manager'), testRazorpayConfig);
router.get('/:paymentId', getPayment);
router.post('/reconcile', authorize('owner', 'manager'), reconcilePayments);

export default router;

