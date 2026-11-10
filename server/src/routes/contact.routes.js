import express from 'express';
import {
  submitContact,
  getContactMessages,
  updateContactStatus,
} from '../controllers/contact.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createContactSchema } from '../validators/contact.validator.js';

const router = express.Router();

router.post('/', validate(createContactSchema), submitContact);
router.get('/', protect, authorize('ADMIN'), getContactMessages);
router.patch('/:id', protect, authorize('ADMIN'), updateContactStatus);

export default router;
