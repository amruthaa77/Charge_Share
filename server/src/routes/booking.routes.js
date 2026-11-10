import express from 'express';
import {
  createBooking,
  confirmBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  hostBookingAction,
} from '../controllers/booking.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createBookingSchema,
  confirmBookingSchema,
  cancelBookingSchema,
  hostActionSchema,
} from '../validators/booking.validator.js';

const router = express.Router();

router.use(protect);

router.post('/', validate(createBookingSchema), createBooking);
router.post('/confirm', validate(confirmBookingSchema), confirmBooking);
router.get('/', getMyBookings);
router.get('/:id', getBookingById);
router.post('/:id/cancel', validate(cancelBookingSchema), cancelBooking);
router.post('/:id/action', authorize('HOST', 'ADMIN'), validate(hostActionSchema), hostBookingAction);

export default router;
