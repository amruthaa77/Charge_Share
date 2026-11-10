import { z } from 'zod';

export const createBookingSchema = z.object({
  chargerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid charger ID format'),
  vehicleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID format').optional(),
  slotStart: z
    .string()
    .datetime({ message: 'Invalid slot start ISO date format' })
    .optional(),
  durationMinutes: z.coerce.number().min(15, 'Minimum booking duration is 15 minutes').max(720).default(60),
  bookingType: z.enum(['INSTANT', 'RESERVATION', 'EMERGENCY']).optional().default('INSTANT'),
  isEmergency: z.boolean().optional().default(false),
  emergencyDetails: z
    .object({
      batteryPercent: z.coerce.number().min(0).max(100).optional(),
      vehicleModel: z.string().max(100).optional(),
      connectorType: z.string().optional(),
      emergencyNote: z.string().max(500).optional(),
      userLocation: z
        .object({
          coordinates: z.array(z.number()).length(2).optional(),
          address: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const confirmBookingSchema = z.object({
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid booking ID format'),
  razorpayOrderId: z.string().optional().default(''),
  razorpayPaymentId: z.string().optional().default(''),
  razorpaySignature: z.string().optional().default(''),
  isMock: z.boolean().optional().default(false),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(3, 'Please provide a cancellation reason').max(300).optional(),
});

export const hostActionSchema = z.object({
  action: z.enum(['CONFIRM', 'REJECT', 'APPROVE']),
  reason: z.string().max(300).optional(),
});
