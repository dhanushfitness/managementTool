import express from 'express';
import {
  createStaff,
  getStaff,
  getStaffMember,
  updateStaff,
  deleteStaff,
  assignShift,
  getStaffShifts,
  getStaffAttendance,
  updateStaffPermissions,
  getStaffTargets,
  createStaffTarget,
  bulkRepChange,
  getRepChangeCounts
} from '../controllers/staff.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', authorize('owner', 'manager'), createStaff);
router.get('/', getStaff);
// Specific routes must come before parameterized routes
router.get('/targets', getStaffTargets);
router.post('/targets', authorize('owner', 'manager'), createStaffTarget);
router.post('/bulk-rep-change', authorize('owner', 'manager'), bulkRepChange);
// Parameterized routes
router.get('/:staffId', getStaffMember);
router.put('/:staffId', authorize('owner', 'manager'), updateStaff);
router.delete('/:staffId', authorize('owner'), deleteStaff);
router.post('/:staffId/shifts', authorize('owner', 'manager'), assignShift);
router.get('/:staffId/shifts', getStaffShifts);
router.get('/:staffId/attendance', getStaffAttendance);
router.put('/:staffId/permissions', authorize('owner'), updateStaffPermissions);
router.get('/:staffId/rep-change-counts', getRepChangeCounts);

export default router;

