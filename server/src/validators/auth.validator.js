import { z } from 'zod';
import { normalizeIndianPhone } from '../utils/phone.js';

export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;

export const phoneValidator = z
  .string()
  .refine((val) => normalizeIndianPhone(val) !== null, {
    message: 'Please enter a valid Indian mobile number (e.g. +91 98765 43210)',
  })
  .transform((val) => normalizeIndianPhone(val));

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters long')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  phone: phoneValidator,
  role: z.enum(['EV_OWNER', 'HOST']).default('EV_OWNER'),
  city: z.string().optional().default('Bengaluru'),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: phoneValidator.optional(),
  city: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid registered email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters long')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(10, 'New password must be at least 10 characters long')
    .regex(
      passwordRegex,
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

export const deleteAccountSchema = z.object({
  confirmationText: z.literal('DELETE', {
    errorMap: () => ({ message: 'You must type DELETE to confirm permanent account deletion' }),
  }),
  reason: z.string().max(500).optional(),
});
