import express from 'express';
import {
  handleRazorpayWebhook,
  handleWhatsAppWebhook,
  handleBiometricWebhook,
  getWebhookEvents
} from '../controllers/webhook.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Webhook routes (no authentication - they use signatures)
router.post('/razorpay', handleRazorpayWebhook);
router.post('/whatsapp', handleWhatsAppWebhook);
router.post('/biometric', handleBiometricWebhook);

// Admin routes for webhook management
router.get('/events', authenticate, authorize('owner', 'manager'), getWebhookEvents);

export default router;

