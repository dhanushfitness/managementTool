import express from 'express';
import {
  getFinancialReport,
  getMemberReport,
  getOperationalReport,
  exportReport,
  scheduleReport
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

export default router;

