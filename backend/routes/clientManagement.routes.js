import express from 'express'
import {
  getClientManagementSettings,
  updateUpgradeSettings,
  updateCrossSellSettings,
  applyMembershipExtension,
  getExtensionSummary
} from '../controllers/clientManagement.controller.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/settings/:branchId', authorize('owner', 'manager', 'staff'), getClientManagementSettings)
router.put('/settings/:branchId/upgrade', authorize('owner', 'manager'), updateUpgradeSettings)
router.put('/settings/:branchId/cross-sell', authorize('owner', 'manager'), updateCrossSellSettings)
router.get('/settings/:branchId/extension', authorize('owner', 'manager', 'staff'), getExtensionSummary)
router.post('/settings/:branchId/extension', authorize('owner', 'manager'), applyMembershipExtension)

export default router

