import express from 'express';
import {
  submitVerification,
  getMyVerificationStatus,
  adminGetPendingVerifications,
  adminReviewVerification,
} from '../controllers/verification.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { submitVerificationSchema, adminReviewSchema } from '../validators/verification.validator.js';

const router = express.Router();

router.use(protect);

router.post('/', authorize('HOST', 'ADMIN'), validate(submitVerificationSchema), submitVerification);
router.get('/my/:chargerId', authorize('HOST', 'ADMIN'), getMyVerificationStatus);

// Admin-only endpoints
router.get('/pending', authorize('ADMIN'), adminGetPendingVerifications);
router.post('/:id/review', authorize('ADMIN'), validate(adminReviewSchema), adminReviewVerification);
router.patch('/:id/review', authorize('ADMIN'), validate(adminReviewSchema), adminReviewVerification);

export default router;
