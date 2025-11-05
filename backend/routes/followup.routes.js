import express from 'express';
import {
  getTaskboard,
  getTaskboardStats,
  updateFollowUpStatus,
  exportTaskboard
} from '../controllers/followup.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/taskboard', getTaskboard);
router.get('/taskboard/stats', getTaskboardStats);
router.put('/taskboard/:followUpId/status', authorize('owner', 'manager', 'staff'), updateFollowUpStatus);
router.get('/taskboard/export', exportTaskboard);

export default router;

