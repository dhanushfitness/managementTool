import express from 'express';
import {
  createInvoice,
  getInvoices,
  getPaidInvoices,
  getPendingCollections,
  getCancelledInvoices,
  getInvoice,
  updateInvoice,
  changeInvoiceItemDate,
  freezeInvoiceItem,
  deleteInvoice,
  sendInvoice,
  sendInvoiceViaEmail,
  downloadInvoicePDF,
  getInvoiceStats,
  exportInvoices,
  exportPaidInvoices,
  exportPendingCollections,
  exportCancelledInvoices
} from '../controllers/invoice.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', authorize('owner', 'manager', 'staff'), createInvoice);
router.get('/', getInvoices);
router.get('/paid', getPaidInvoices);
router.get('/paid/export', exportPaidInvoices);
router.get('/pending-collections', getPendingCollections);
router.get('/pending-collections/export', exportPendingCollections);
router.get('/cancelled', getCancelledInvoices);
router.get('/cancelled/export', exportCancelledInvoices);
router.get('/stats', getInvoiceStats);
router.get('/export', exportInvoices);
router.post('/change-date', authorize('owner', 'manager', 'staff'), changeInvoiceItemDate);
router.post('/freeze', authorize('owner', 'manager', 'staff'), freezeInvoiceItem);
router.get('/:invoiceId', getInvoice);
router.put('/:invoiceId', authorize('owner', 'manager', 'staff'), updateInvoice);
router.delete('/:invoiceId', authorize('owner', 'manager'), deleteInvoice);
router.post('/:invoiceId/send', authorize('owner', 'manager', 'staff'), sendInvoice);
router.post('/:invoiceId/send-email', authorize('owner', 'manager', 'staff'), sendInvoiceViaEmail);
router.get('/:invoiceId/download', downloadInvoicePDF);

export default router;

