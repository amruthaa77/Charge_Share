import express from 'express';
import {
  createReport,
  getReports,
  updateReportStatus,
} from '../controllers/report.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createReportSchema, updateReportSchema } from '../validators/report.validator.js';

const router = express.Router();

router.use(protect);

router.post('/', validate(createReportSchema), createReport);
router.get('/', getReports);
router.patch('/:id', authorize('ADMIN'), validate(updateReportSchema), updateReportStatus);

export default router;
