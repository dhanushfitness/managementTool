import express from 'express';
import {
  createPlan,
  getPlans,
  getPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus
} from '../controllers/plan.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', authorize('owner', 'manager'), createPlan);
router.get('/', getPlans);
router.get('/:planId', getPlan);
router.put('/:planId', authorize('owner', 'manager'), updatePlan);
router.delete('/:planId', authorize('owner', 'manager'), deletePlan);
router.patch('/:planId/status', authorize('owner', 'manager'), togglePlanStatus);

export default router;

