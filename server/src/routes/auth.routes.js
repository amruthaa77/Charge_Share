import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  logoutAllDevices,
  deleteAccount,
  changePassword,
  adminChangeForcedPassword,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  deleteAccountSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);

router.get('/me', protect, getMe);
router.put('/profile', protect, validate(updateProfileSchema), updateProfile);
router.put('/change-password', protect, validate(changePasswordSchema), changePassword);
router.post('/admin-change-password', protect, adminChangeForcedPassword);
router.post('/logout-all', protect, logoutAllDevices);
router.post('/delete-account', protect, validate(deleteAccountSchema), deleteAccount);

export default router;
