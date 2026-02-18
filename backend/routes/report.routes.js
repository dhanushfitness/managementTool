import express from 'express';
import {
  getServiceSalesReport,
  exportServiceSalesReport,
  getUpgradeReport,
  exportUpgradeReport,
  getMemberCheckinsReport,
  exportMemberCheckinsReport,
  getNewClientsReport,
  exportNewClientsReport,
  getRenewalsReport,
  exportRenewalsReport,
  getServiceExpiryReport,
  exportServiceExpiryReport,
  getBirthdayReport,
  exportBirthdayReport,
  getStaffBirthdayReport,
  exportStaffBirthdayReport
} from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/service-sales', authorize('owner', 'manager', 'staff'), getServiceSalesReport);
router.get('/service-sales/export', authorize('owner', 'manager', 'staff'), exportServiceSalesReport);

router.get('/upgrade', authorize('owner', 'manager', 'staff'), getUpgradeReport);
router.get('/upgrade/export', authorize('owner', 'manager', 'staff'), exportUpgradeReport);

router.get('/member-checkins', authorize('owner', 'manager', 'staff'), getMemberCheckinsReport);
router.get('/member-checkins/export', authorize('owner', 'manager', 'staff'), exportMemberCheckinsReport);

router.get('/new-clients', authorize('owner', 'manager', 'staff'), getNewClientsReport);
router.get('/new-clients/export', authorize('owner', 'manager', 'staff'), exportNewClientsReport);

router.get('/renewals', authorize('owner', 'manager', 'staff'), getRenewalsReport);
router.get('/renewals/export', authorize('owner', 'manager', 'staff'), exportRenewalsReport);

router.get('/service-expiry', authorize('owner', 'manager', 'staff'), getServiceExpiryReport);
router.get('/service-expiry/export', authorize('owner', 'manager', 'staff'), exportServiceExpiryReport);

router.get('/birthday', authorize('owner', 'manager', 'staff'), getBirthdayReport);
router.get('/birthday/export', authorize('owner', 'manager', 'staff'), exportBirthdayReport);

router.get('/staff/birthday', authorize('owner', 'manager', 'staff'), getStaffBirthdayReport);
router.get('/staff/birthday/export', authorize('owner', 'manager', 'staff'), exportStaffBirthdayReport);

export default router;
