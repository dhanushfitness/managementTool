import express from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  downloadInvoicePDF,
  getInvoiceStats
} from '../controllers/invoice.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', authorize('owner', 'manager', 'staff'), createInvoice);
router.get('/', getInvoices);
router.get('/stats', getInvoiceStats);
router.get('/:invoiceId', getInvoice);
router.put('/:invoiceId', authorize('owner', 'manager', 'staff'), updateInvoice);
router.delete('/:invoiceId', authorize('owner', 'manager'), deleteInvoice);
router.post('/:invoiceId/send', authorize('owner', 'manager', 'staff'), sendInvoice);
router.get('/:invoiceId/download', downloadInvoicePDF);

export default router;

