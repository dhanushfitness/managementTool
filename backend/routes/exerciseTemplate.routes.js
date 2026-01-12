import express from 'express';
import {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  assignTemplateToMember,
  duplicateTemplate
} from '../controllers/exerciseTemplate.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Template CRUD
router.post('/', authorize('owner', 'manager', 'staff'), createTemplate);
router.get('/', getTemplates);
router.get('/:templateId', getTemplate);
router.put('/:templateId', authorize('owner', 'manager', 'staff'), updateTemplate);
router.delete('/:templateId', authorize('owner', 'manager', 'staff'), deleteTemplate);

// Template operations
router.post('/:templateId/duplicate', authorize('owner', 'manager', 'staff'), duplicateTemplate);
router.post('/assign', authorize('owner', 'manager', 'staff'), assignTemplateToMember);

export default router;
