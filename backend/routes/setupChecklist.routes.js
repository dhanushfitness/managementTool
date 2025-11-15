import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getSetupChecklist,
  updateSetupTaskStatus
} from '../controllers/setupChecklist.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getSetupChecklist);
router.patch('/:taskKey', authorize('owner', 'manager'), updateSetupTaskStatus);

export default router;


