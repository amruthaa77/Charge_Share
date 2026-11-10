import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional().or(z.literal('')),
  subject: z.enum([
    'GENERAL_INQUIRY',
    'HOSTING_SUPPORT',
    'BOOKING_ISSUE',
    'SAFETY_CONCERN',
    'PARTNERSHIP',
    'GRIEVANCE',
  ]),
  message: z.string().min(10, 'Message must be at least 10 characters long').max(2000),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: 'You must provide explicit consent before submitting' }),
  }),
});
