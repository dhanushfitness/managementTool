import express from 'express';
import {
  getRevenueLeaderboard,
  getClosureCountLeaderboard,
  getContactsCreatedLeaderboard,
  getCallLeaderboard,
  exportLeaderboard
} from '../controllers/leaderboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/revenue', getRevenueLeaderboard);
router.get('/closure-count', getClosureCountLeaderboard);
router.get('/contacts-created', getContactsCreatedLeaderboard);
router.get('/calls', getCallLeaderboard);
router.get('/export', exportLeaderboard);

export default router;

