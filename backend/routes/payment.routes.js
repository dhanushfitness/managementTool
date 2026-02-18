import express from 'express';
import {
  createPayment,
  getPayments,
  getPayment,
  refundPayment,
  getPaymentStats,
  reconcilePayments,
  getReceipts,
  exportReceipts
} from '../controllers/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', authorize('owner', 'manager', 'staff'), createPayment);
router.post('/:paymentId/refund', authorize('owner', 'manager'), refundPayment);
router.get('/', getPayments);
router.get('/receipts', getReceipts);
router.get('/receipts/export', exportReceipts);
router.get('/stats', getPaymentStats);
router.get('/:paymentId', getPayment);
router.post('/reconcile', authorize('owner', 'manager'), reconcilePayments);

export default router;

