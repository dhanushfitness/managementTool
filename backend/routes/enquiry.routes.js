import express from 'express';
import {
  createEnquiry,
  getEnquiries,
  getEnquiry,
  updateEnquiry,
  deleteEnquiry,
  convertToMember,
  archiveEnquiry,
  getEnquiryStats,
  importEnquiries,
  exportEnquiries,
  bulkArchive,
  bulkChangeStaff,
  addCallLog,
  getEnquiryAppointments,
  createEnquiryAppointment
} from '../controllers/enquiry.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', authorize('owner', 'manager', 'staff'), createEnquiry);
router.get('/', getEnquiries);
router.get('/stats', getEnquiryStats);
router.get('/export', authorize('owner', 'manager'), exportEnquiries);
router.post('/import', authorize('owner', 'manager'), importEnquiries);
router.post('/bulk/archive', authorize('owner', 'manager'), bulkArchive);
router.post('/bulk/staff-change', authorize('owner', 'manager'), bulkChangeStaff);
router.get('/:enquiryId', getEnquiry);
router.put('/:enquiryId', authorize('owner', 'manager', 'staff'), updateEnquiry);
router.delete('/:enquiryId', authorize('owner', 'manager'), deleteEnquiry);
router.post('/:enquiryId/convert', authorize('owner', 'manager', 'staff'), convertToMember);
router.post('/:enquiryId/archive', authorize('owner', 'manager', 'staff'), archiveEnquiry);
router.post('/:enquiryId/call-log', authorize('owner', 'manager', 'staff'), addCallLog);
router.get('/:enquiryId/appointments', getEnquiryAppointments);
router.post('/:enquiryId/appointments', authorize('owner', 'manager', 'staff'), createEnquiryAppointment);

export default router;

