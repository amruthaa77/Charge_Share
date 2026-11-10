import { z } from 'zod';

export const vehicleSchema = z.object({
  make: z.string().min(1, 'Make is required').max(50),
  model: z.string().min(1, 'Model is required').max(50),
  year: z.coerce.number().min(2010).max(new Date().getFullYear() + 1),
  registrationNumber: z.string().min(4, 'Registration number is required').max(20),
  connectorType: z.enum(['CCS2', 'Type 2', 'Bharat AC-001', '3-pin', 'CHAdeMO']),
  batteryCapacityKWh: z.coerce.number().min(1).max(200).optional().default(30),
  isDefault: z.boolean().optional().default(false),
});

export const updateVehicleSchema = vehicleSchema.partial();
