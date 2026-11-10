import { z } from 'zod';

export const BENGALURU_BOUNDS = {
  MIN_LAT: 12.80,
  MAX_LAT: 13.15,
  MIN_LNG: 77.45,
  MAX_LNG: 77.75,
  DEFAULT_LAT: 12.9716,
  DEFAULT_LNG: 77.5946,
};

export const createChargerSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required').default('Bengaluru'),
  state: z.string().min(2, 'State is required').default('Karnataka'),
  postalCode: z.string().regex(/^\d{6}$/, 'Please enter a valid 6-digit Indian PIN code'),
  latitude: z.coerce
    .number()
    .min(BENGALURU_BOUNDS.MIN_LAT, `Latitude must be within Bengaluru bounds (${BENGALURU_BOUNDS.MIN_LAT} to ${BENGALURU_BOUNDS.MAX_LAT})`)
    .max(BENGALURU_BOUNDS.MAX_LAT, `Latitude must be within Bengaluru bounds (${BENGALURU_BOUNDS.MIN_LAT} to ${BENGALURU_BOUNDS.MAX_LAT})`),
  longitude: z.coerce
    .number()
    .min(BENGALURU_BOUNDS.MIN_LNG, `Longitude must be within Bengaluru bounds (${BENGALURU_BOUNDS.MIN_LNG} to ${BENGALURU_BOUNDS.MAX_LNG})`)
    .max(BENGALURU_BOUNDS.MAX_LNG, `Longitude must be within Bengaluru bounds (${BENGALURU_BOUNDS.MIN_LNG} to ${BENGALURU_BOUNDS.MAX_LNG})`),
  connectorType: z.enum(['CCS2', 'Type 2', 'Bharat AC-001', '3-pin', 'CHAdeMO']),
  powerKW: z.coerce.number().min(1).max(350),
  pricingType: z.enum(['PER_KWH', 'PER_HOUR']).default('PER_KWH'),
  price: z.coerce.number().min(1, 'Price must be greater than 0'),
  photos: z.array(z.string()).optional().default([]),
  houseRules: z.array(z.string()).optional().default([]),
  safetyFeatures: z.array(z.string()).optional().default([]),
  instantBooking: z.boolean().optional().default(true),
  availabilityMode: z.enum(['INSTANT_BOOKING', 'REQUEST_APPROVAL', 'SCHEDULED_ONLY', 'EMERGENCY_ONLY']).optional().default('INSTANT_BOOKING'),
  emergencySupport: z.boolean().optional().default(true),
  allowsReservations: z.boolean().optional().default(true),
  requiresApproval: z.boolean().optional().default(false),
  responseTimeMinutes: z.coerce.number().min(1).max(60).optional().default(5),
  idleFeePerMinute: z.coerce.number().min(0).max(50).optional().default(2),
  contactPhone: z.string().optional().default(''),
  weeklySchedule: z
    .array(
      z.object({
        day: z.number().min(0).max(6),
        open: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
        close: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
        isActive: z.boolean().default(true),
      })
    )
    .optional(),
});

export const updateChargerSchema = createChargerSchema.partial();

export const chargerFilterSchema = z.object({
  lat: z.coerce.number().min(BENGALURU_BOUNDS.MIN_LAT).max(BENGALURU_BOUNDS.MAX_LAT).optional(),
  lng: z.coerce.number().min(BENGALURU_BOUNDS.MIN_LNG).max(BENGALURU_BOUNDS.MAX_LNG).optional(),
  radiusKm: z.coerce.number().min(1).max(100).optional().default(25),
  city: z.string().optional().default('Bengaluru'),
  area: z.string().optional(),
  connectorType: z.enum(['CCS2', 'Type 2', 'Bharat AC-001', '3-pin', 'CHAdeMO']).optional(),
  minPower: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  verifiedOnly: z.preprocess((val) => {
    if (val === undefined || val === '') return true;
    return val === 'true' || val === true;
  }, z.boolean().optional().default(true)),
  todayOnly: z.preprocess((val) => {
    if (val === undefined || val === '') return false;
    return val === 'true' || val === true;
  }, z.boolean().optional().default(false)),
  availableNow: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    return val === 'true' || val === true;
  }, z.boolean().optional()),
  emergencyOnly: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    return val === 'true' || val === true;
  }, z.boolean().optional()),
  instantBookingOnly: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    return val === 'true' || val === true;
  }, z.boolean().optional()),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});
