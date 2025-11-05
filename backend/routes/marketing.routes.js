import express from 'express';
import {
  sendEmail,
  sendSMS,
  sendWhatsApp,
  getCommunications,
  createOffer,
  getOffers,
  updateOffer,
  deleteOffer
} from '../controllers/marketing.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Communication routes
router.post('/communication/email', authorize('owner', 'manager', 'staff'), sendEmail);
router.post('/communication/sms', authorize('owner', 'manager', 'staff'), sendSMS);
router.post('/communication/whatsapp', authorize('owner', 'manager', 'staff'), sendWhatsApp);
router.get('/communications', getCommunications);

// Engagement/Offers routes
router.post('/engagement/offers', authorize('owner', 'manager'), createOffer);
router.get('/engagement/offers', getOffers);
router.put('/engagement/offers/:offerId', authorize('owner', 'manager'), updateOffer);
router.delete('/engagement/offers/:offerId', authorize('owner', 'manager'), deleteOffer);

export default router;

