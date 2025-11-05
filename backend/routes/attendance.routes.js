import express from 'express';
import {
  checkIn,
  checkOut,
  getAttendance,
  getAttendanceStats,
  getMemberAttendanceHistory,
  getBranchAttendance,
  exportAttendance
} from '../controllers/attendance.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/checkin', authorize('owner', 'manager', 'staff'), checkIn);
router.post('/checkout', authorize('owner', 'manager', 'staff'), checkOut);
router.get('/', getAttendance);
router.get('/stats', getAttendanceStats);
router.get('/member/:memberId', getMemberAttendanceHistory);
router.get('/branch/:branchId', getBranchAttendance);
router.get('/export', authorize('owner', 'manager'), exportAttendance);

export default router;

