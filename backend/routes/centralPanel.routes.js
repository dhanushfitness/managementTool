import express from 'express';
import {
  getRevenueData,
  getLeadManagementData,
  getClientsData,
  getCheckInsData,
  getFilterOptions
} from '../controllers/centralPanel.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Only owner/manager can access central panel
router.get('/revenue', authorize('owner', 'manager'), getRevenueData);
router.get('/lead-management', authorize('owner', 'manager'), getLeadManagementData);
router.get('/clients', authorize('owner', 'manager'), getClientsData);
router.get('/check-ins', authorize('owner', 'manager'), getCheckInsData);
router.get('/filter-options', authorize('owner', 'manager'), getFilterOptions);

export default router;
