import express from 'express';
import {
  checkIn,
  checkOut,
  getAttendance,
  getAttendanceStats,
  getMemberAttendanceHistory,
  getBranchAttendance,
  exportAttendance,
  searchMemberByAttendanceId,
  getMemberActiveServices,
  updateAttendance,
  fingerprintCheckIn
} from '../controllers/attendance.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/checkin', authorize('owner', 'manager', 'staff'), checkIn);
router.post('/checkout', authorize('owner', 'manager', 'staff'), checkOut);
router.get('/search', searchMemberByAttendanceId);
router.get('/member/:memberId/services', getMemberActiveServices);
router.get('/member/:memberId', getMemberAttendanceHistory);
router.put('/:attendanceId', authorize('owner', 'manager', 'staff'), updateAttendance);
router.post('/fingerprint', fingerprintCheckIn); // Public endpoint for device integration
router.get('/', getAttendance);
router.get('/stats', getAttendanceStats);
router.get('/branch/:branchId', getBranchAttendance);
router.get('/export', authorize('owner', 'manager'), exportAttendance);

export default router;

