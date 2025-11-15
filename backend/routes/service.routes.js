import express from 'express';
import {
  getServices,
  createService,
  updateService,
  toggleServiceStatus,
  deleteService,
  createServiceVariation,
  updateServiceVariation,
  toggleServiceVariationStatus,
  deleteServiceVariation
} from '../controllers/service.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getServices);
router.post('/', authorize('owner', 'manager'), createService);
router.put('/:serviceId', authorize('owner', 'manager'), updateService);
router.patch('/:serviceId/status', authorize('owner', 'manager'), toggleServiceStatus);
router.delete('/:serviceId', authorize('owner', 'manager'), deleteService);

router.post('/:serviceId/variations', authorize('owner', 'manager'), createServiceVariation);
router.put('/:serviceId/variations/:variationId', authorize('owner', 'manager'), updateServiceVariation);
router.patch('/:serviceId/variations/:variationId/status', authorize('owner', 'manager'), toggleServiceVariationStatus);
router.delete('/:serviceId/variations/:variationId', authorize('owner', 'manager'), deleteServiceVariation);

export default router;


