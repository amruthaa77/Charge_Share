import { z } from 'zod';

export const createReportSchema = z.object({
  chargerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid charger ID format'),
  reason: z.enum([
    'INACCURATE_LOCATION',
    'BROKEN_HARDWARE',
    'HOST_UNRESPONSIVE',
    'SAFETY_HAZARD',
    'OVERCHARGING',
    'OTHER',
  ]),
  description: z.string().min(10, 'Please provide at least 10 characters of detail').max(1000),
  photoUrl: z.string().url().optional().or(z.literal('')),
});

export const updateReportSchema = z.object({
  status: z.enum(['PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']),
  adminNotes: z.string().max(1000).optional(),
});
