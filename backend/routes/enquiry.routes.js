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
  bulkChangeStaff
} from '../controllers/enquiry.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', authorize('owner', 'manager', 'staff'), createEnquiry);
router.get('/', getEnquiries);
router.get('/stats', getEnquiryStats);
router.get('/:enquiryId', getEnquiry);
router.put('/:enquiryId', authorize('owner', 'manager', 'staff'), updateEnquiry);
router.delete('/:enquiryId', authorize('owner', 'manager'), deleteEnquiry);
router.post('/:enquiryId/convert', authorize('owner', 'manager', 'staff'), convertToMember);
router.post('/:enquiryId/archive', authorize('owner', 'manager', 'staff'), archiveEnquiry);
router.post('/import', authorize('owner', 'manager'), importEnquiries);
router.get('/export', authorize('owner', 'manager'), exportEnquiries);
router.post('/bulk/archive', authorize('owner', 'manager'), bulkArchive);
router.post('/bulk/staff-change', authorize('owner', 'manager'), bulkChangeStaff);

export default router;

