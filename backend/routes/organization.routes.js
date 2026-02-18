import express from 'express';
import {
  createOrganization,
  getOrganization,
  updateOrganization,
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
  deleteBranch,
  getOnboardingStatus,
  updateOnboardingStatus,
  connectWhatsApp,
  uploadOrganizationLogo
} from '../controllers/organization.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const organizationUploadsPath = path.join(process.cwd(), 'uploads', 'organizations');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(organizationUploadsPath, { recursive: true });
      cb(null, organizationUploadsPath);
    } catch (error) {
      cb(error, organizationUploadsPath);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    const extension = path.extname(sanitizedOriginalName) || '.png';
    const baseName = path.basename(sanitizedOriginalName, extension);
    cb(null, `org-${timestamp}-${baseName}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed for organization logo'));
    }
    cb(null, true);
  }
});

const handleLogoUpload = (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// All routes require authentication
router.use(authenticate);

// Organization routes
router.post('/', authorize('owner'), createOrganization);
router.get('/', getOrganization);
router.put('/', authorize('owner', 'manager'), updateOrganization);

// Branch routes
router.post('/branches', authorize('owner', 'manager'), createBranch);
router.get('/branches', getBranches);
router.get('/branches/:branchId', getBranch);
router.put('/branches/:branchId', authorize('owner', 'manager'), updateBranch);
router.delete('/branches/:branchId', authorize('owner'), deleteBranch);

// Onboarding
router.get('/onboarding', getOnboardingStatus);
router.put('/onboarding', authorize('owner', 'manager'), updateOnboardingStatus);

// Integrations
router.post('/integrations/whatsapp', authorize('owner', 'manager'), connectWhatsApp);
router.put('/logo', authorize('owner', 'manager'), handleLogoUpload, uploadOrganizationLogo);

export default router;

