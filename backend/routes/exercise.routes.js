import express from 'express';
import {
  createExercise,
  getExercises,
  getExercise,
  updateExercise,
  deleteExercise,
  assignExerciseToMember,
  getMemberExercises,
  updateAssignment,
  deleteAssignment,
  bulkDeleteAssignments,
  markExerciseCompleted,
  getMemberProgress,
  upload
} from '../controllers/exercise.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { authenticateMember } from '../middleware/memberAuth.middleware.js';

const router = express.Router();

// Admin routes (require authentication)
router.use(authenticate);

// Exercise CRUD
router.post('/', authorize('owner', 'manager', 'staff'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), createExercise);

router.get('/', getExercises);
router.get('/:exerciseId', getExercise);
router.put('/:exerciseId', authorize('owner', 'manager', 'staff'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), updateExercise);
router.delete('/:exerciseId', authorize('owner', 'manager', 'staff'), deleteExercise);

// Assignment routes (admin)
router.post('/assign', authorize('owner', 'manager', 'staff'), assignExerciseToMember);
router.get('/member/:memberId', getMemberExercises); // Admin can view any member's exercises
router.put('/assignment/:assignmentId', authorize('owner', 'manager', 'staff'), updateAssignment);
router.delete('/assignment/:assignmentId', authorize('owner', 'manager', 'staff'), deleteAssignment);
router.post('/bulk-delete', authorize('owner', 'manager', 'staff'), bulkDeleteAssignments);

// Member routes (separate authentication - members can view their own exercises)
const memberRouter = express.Router();
memberRouter.use(authenticateMember);
memberRouter.get('/my-exercises', getMemberExercises);
memberRouter.get('/progress', getMemberProgress);
memberRouter.post('/assignment/:assignmentId/complete', markExerciseCompleted);
memberRouter.patch('/assignment/:assignmentId', updateAssignment);

export { memberRouter as memberExerciseRoutes };
export default router;

