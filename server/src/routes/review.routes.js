import express from 'express';
import { createReview, getChargerReviews } from '../controllers/review.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createReviewSchema } from '../validators/review.validator.js';

const router = express.Router();

router.post('/', protect, validate(createReviewSchema), createReview);
router.get('/charger/:chargerId', getChargerReviews);

export default router;
