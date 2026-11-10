import express from 'express';
import {
  createCharger,
  getChargers,
  getChargerById,
  getMyListings,
  updateCharger,
  pauseCharger,
  deleteCharger,
  getChargerAvailability,
  getChargerLiveStatus,
  getEmergencyAlternatives,
} from '../controllers/charger.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createChargerSchema,
  updateChargerSchema,
  chargerFilterSchema,
} from '../validators/charger.validator.js';

const router = express.Router();

router.get('/', validate(chargerFilterSchema, 'query'), getChargers);
router.get('/emergency-alternatives', getEmergencyAlternatives);
router.get('/my/listings', protect, authorize('HOST', 'ADMIN'), getMyListings);
router.get('/:id', getChargerById);
router.get('/:id/live-status', getChargerLiveStatus);
router.get('/:id/availability', getChargerAvailability);

router.post('/', protect, authorize('HOST', 'ADMIN'), validate(createChargerSchema), createCharger);
router.put('/:id', protect, authorize('HOST', 'ADMIN'), validate(updateChargerSchema), updateCharger);
router.patch('/:id/pause', protect, authorize('HOST', 'ADMIN'), pauseCharger);
router.delete('/:id', protect, authorize('HOST', 'ADMIN'), deleteCharger);

export default router;
