import express from 'express';
import {
  memberLogin,
  setMemberPassword,
  changeMemberPassword,
  getMemberProfile,
  updateMemberProfile
} from '../controllers/memberAuth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { authenticateMember } from '../middleware/memberAuth.middleware.js';

const router = express.Router();

// Public routes
router.post('/login', memberLogin);

// Admin routes (set password for members)
router.post('/set-password', authenticate, authorize('owner', 'manager', 'staff'), setMemberPassword);

// Member routes (require member authentication)
router.use(authenticateMember);
router.get('/profile', getMemberProfile);
router.put('/profile', updateMemberProfile);
router.post('/change-password', changeMemberPassword);

export default router;

