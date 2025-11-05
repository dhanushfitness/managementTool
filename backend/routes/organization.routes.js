import express from 'express';
import {
  createOrganization,
  getOrganization,
  updateOrganization,
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
  deleteBranch,
  getOnboardingStatus,
  updateOnboardingStatus,
  connectRazorpay,
  connectWhatsApp
} from '../controllers/organization.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Organization routes
router.post('/', authorize('owner'), createOrganization);
router.get('/', getOrganization);
router.put('/', authorize('owner', 'manager'), updateOrganization);

// Branch routes
router.post('/branches', authorize('owner', 'manager'), createBranch);
router.get('/branches', getBranches);
router.get('/branches/:branchId', getBranch);
router.put('/branches/:branchId', authorize('owner', 'manager'), updateBranch);
router.delete('/branches/:branchId', authorize('owner'), deleteBranch);

// Onboarding
router.get('/onboarding', getOnboardingStatus);
router.put('/onboarding', authorize('owner', 'manager'), updateOnboardingStatus);

// Integrations
router.post('/integrations/razorpay', authorize('owner', 'manager'), connectRazorpay);
router.post('/integrations/whatsapp', authorize('owner', 'manager'), connectWhatsApp);

export default router;

