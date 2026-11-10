import { z } from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid booking ID format'),
  rating: z.coerce.number().min(1, 'Rating must be at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
  comment: z.string().min(5, 'Comment must be at least 5 characters').max(500),
});
