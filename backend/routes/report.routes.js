import express from 'express';
import {
  getFinancialReport,
  getMemberReport,
  getOperationalReport,
  exportReport,
  scheduleReport,
  getBiometricReport,
  getBiometricStaffReport,
  getBiometricMulticlubReport,
  getBiometricDevices,
  exportBiometricReport,
  getOffersReport,
  getLeadSourceReport,
  exportLeadSourceReport,
  getReferralReport,
  getMemberReferralReport
} from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/financial', authorize('owner', 'manager', 'accountant'), getFinancialReport);
router.get('/members', authorize('owner', 'manager'), getMemberReport);
router.get('/operational', authorize('owner', 'manager'), getOperationalReport);
router.get('/export', authorize('owner', 'manager', 'accountant'), exportReport);
router.post('/schedule', authorize('owner', 'manager'), scheduleReport);

// Biometric Report routes
router.get('/biometric', authorize('owner', 'manager', 'staff'), getBiometricReport);
router.get('/biometric/staff', authorize('owner', 'manager', 'staff'), getBiometricStaffReport);
router.get('/biometric/multiclub', authorize('owner', 'manager', 'staff'), getBiometricMulticlubReport);
router.get('/biometric/devices', authorize('owner', 'manager', 'staff'), getBiometricDevices);
router.get('/biometric/export', authorize('owner', 'manager', 'staff'), exportBiometricReport);

// Marketing Report routes
router.get('/offers', authorize('owner', 'manager', 'staff'), getOffersReport);
router.get('/lead-source', authorize('owner', 'manager', 'staff'), getLeadSourceReport);
router.get('/lead-source/export', authorize('owner', 'manager', 'staff'), exportLeadSourceReport);
router.get('/referral', authorize('owner', 'manager', 'staff'), getReferralReport);
router.get('/referral/member', authorize('owner', 'manager', 'staff'), getMemberReferralReport);

export default router;

