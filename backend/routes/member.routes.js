import express from 'express';
import {
  createMember,
  getMembers,
  getMember,
  updateMember,
  deleteMember,
  enrollMember,
  renewMembership,
  freezeMembership,
  unfreezeMembership,
  upgradeDowngradePlan,
  getMemberAttendance,
  getMemberInvoices,
  getMemberInvoicesWithPayments,
  getMemberPayments,
  getMemberCalls,
  createMemberCall,
  updateMemberCall,
  getMemberReferrals,
  createMemberReferral,
  importMembers,
  searchMembers,
  getMemberStats
} from '../controllers/member.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Member CRUD
router.post('/', authorize('owner', 'manager', 'staff'), createMember);
router.get('/', getMembers);
router.get('/stats', getMemberStats);
router.get('/search', searchMembers);
router.get('/:memberId', getMember);
router.put('/:memberId', authorize('owner', 'manager', 'staff'), updateMember);
router.delete('/:memberId', authorize('owner', 'manager'), deleteMember);

// Membership operations
router.post('/:memberId/enroll', authorize('owner', 'manager', 'staff'), enrollMember);
router.post('/:memberId/renew', authorize('owner', 'manager', 'staff'), renewMembership);
router.post('/:memberId/freeze', authorize('owner', 'manager', 'staff'), freezeMembership);
router.post('/:memberId/unfreeze', authorize('owner', 'manager', 'staff'), unfreezeMembership);
router.post('/:memberId/change-plan', authorize('owner', 'manager'), upgradeDowngradePlan);

// Member data
router.get('/:memberId/attendance', getMemberAttendance);
router.get('/:memberId/invoices', getMemberInvoices);
router.get('/:memberId/invoices-with-payments', getMemberInvoicesWithPayments);
router.get('/:memberId/payments', getMemberPayments);
router.get('/:memberId/calls', getMemberCalls);
router.post('/:memberId/calls', authorize('owner', 'manager', 'staff'), createMemberCall);
router.put('/:memberId/calls/:callId', authorize('owner', 'manager', 'staff'), updateMemberCall);
router.get('/:memberId/referrals', getMemberReferrals);
router.post('/:memberId/referrals', authorize('owner', 'manager', 'staff'), createMemberReferral);

// Bulk operations
router.post('/import', authorize('owner', 'manager'), importMembers);

export default router;

