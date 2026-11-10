import express from 'express';
import {
  createVehicle,
  getMyVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} from '../controllers/vehicle.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { vehicleSchema, updateVehicleSchema } from '../validators/vehicle.validator.js';

const router = express.Router();

router.use(protect);
router.use(authorize('EV_OWNER', 'HOST')); // Personal garage operations restricted to riders & hosts

router.post('/', validate(vehicleSchema), createVehicle);
router.get('/', getMyVehicles);
router.get('/:id', getVehicleById);
router.put('/:id', validate(updateVehicleSchema), updateVehicle);
router.delete('/:id', deleteVehicle);

export default router;
