import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config/env.js';
import { User } from '../models/User.js';
import { Booking } from '../models/Booking.js';
import { Charger } from '../models/Charger.js';
import { normalizeIndianPhone } from '../utils/phone.js';
import {
  sendWelcomeAndVerificationEmail,
  sendPasswordResetEmail,
  sendAccountDeletionEmail,
} from '../services/email.service.js';
import { sendAdminTokenResponse, adminRotatePassword } from './admin.auth.controller.js';

const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

const generateToken = (id, tokenVersion = 0) => {
  return jwt.sign(
    { id, tokenVersion, scope: 'user' },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id, user.tokenVersion || 0);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      isVerifiedHost: user.isVerifiedHost,
      city: user.city,
      emailVerified: user.emailVerified || false,
      trustStatus: user.trustStatus || 'UNVERIFIED',
      mustChangePassword: user.mustChangePassword || false,
    },
  });
};

export const register = async (req, res, next) => {
  let createdUser = null;
  try {
    const { name, email, password, phone, role, city } = req.body;

    if (role === 'ADMIN') {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Administrator accounts cannot be created via public registration.',
        errors: [{ field: 'role', message: 'Administrator accounts cannot be created via public registration' }],
        requestId: req.id,
      });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPhone = normalizeIndianPhone(phone) || phone;

    const existingEmailUser = await User.findOne({ email: normalizedEmail, isDeleted: { $ne: true } });
    if (existingEmailUser) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_TAKEN',
        message: 'An account with this email address already exists. Sign in instead.',
        errors: [
          {
            field: 'email',
            message: 'An account with this email address already exists. Sign in instead.',
          },
        ],
        requestId: req.id,
      });
    }

    const existingPhoneUser = await User.findOne({
      phone: normalizedPhone,
      role: role || 'EV_OWNER',
      isDeleted: { $ne: true },
    });
    if (existingPhoneUser) {
      return res.status(409).json({
        success: false,
        code: 'PHONE_REGISTERED',
        message: 'This phone number is already registered.',
        errors: [
          {
            field: 'phone',
            message: 'This phone number is already registered.',
          },
        ],
        requestId: req.id,
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    createdUser = await User.create({
      name: (name || '').trim(),
      email: normalizedEmail,
      password,
      phone: normalizedPhone,
      role: role || 'EV_OWNER',
      city: (city || 'Bengaluru').trim(),
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Fire welcome email asynchronously without blocking registration
    sendWelcomeAndVerificationEmail(createdUser, verificationToken).catch((err) =>
      console.error('Welcome email error:', err.message)
    );

    try {
      sendTokenResponse(createdUser, 201, res);
    } catch (postCreateError) {
      if (createdUser && createdUser._id) {
        await User.findByIdAndDelete(createdUser._id);
      }
      throw postCreateError;
    }
  } catch (error) {
    if (createdUser && createdUser._id) {
      try {
        await User.findByIdAndDelete(createdUser._id);
      } catch (cleanupErr) {
        console.error('Failed to rollback created user:', cleanupErr.message);
      }
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, isDeleted: { $ne: true } })
      .select('+password +failedLoginAttempts +lockUntil');

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        requestId: req.id,
      });
    }

    // Platform administrators must sign in via the dedicated admin portal (/admin/login)
    if (user.role === 'ADMIN') {
      await bcrypt.compare(password || '', DUMMY_HASH);
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        requestId: req.id,
      });
    }

    if (user.isLocked()) {
      if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
        const waitMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked due to consecutive failed attempts. Please retry in ${waitMinutes} minute(s).`,
          waitMinutes,
          requestId: req.id,
        });
      } else {
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save({ validateBeforeSave: false });
      }
    }

    if (user.trustStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: `Account suspended. Reason: ${user.trustReason || 'Policy violation'}. Contact support@chargeshare.in`,
        requestId: req.id,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock
      }
      await user.save({ validateBeforeSave: false });

      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        requestId: req.id,
      });
    }

    // Reset failed login attempts on success
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save({ validateBeforeSave: false });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {};
    const allowed = ['name', 'phone', 'city', 'avatar'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fieldsToUpdate[key] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, isDeleted: { $ne: true } });

    if (!user) {
      // Return safe message to prevent account enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been sent.',
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
    await user.save({ validateBeforeSave: false });

    // Send reset email
    await sendPasswordResetEmail(user, rawToken);

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.',
      // In test mode include token for automation assertions
      ...(process.env.NODE_ENV === 'test' ? { testToken: rawToken } : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      isDeleted: { $ne: true },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_RESET_TOKEN',
        message: 'Password reset token is invalid or has expired.',
        requestId: req.id,
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all prior sessions
    await user.save();

    return sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
      isDeleted: { $ne: true },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_VERIFY_TOKEN',
        message: 'Verification token is invalid or has expired.',
        requestId: req.id,
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email address verified successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'User not found', requestId: req.id });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        code: 'INCORRECT_PASSWORD',
        message: 'Current password is incorrect.',
        errors: [{ field: 'currentPassword', message: 'Current password is incorrect.' }],
        requestId: req.id,
      });
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    return sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const logoutAllDevices = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save({ validateBeforeSave: false });

    // Issue new token with the bumped tokenVersion so the current device session stays valid
    const newToken = generateToken(user._id, user.tokenVersion);

    res.cookie('token', newToken, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.status(200).json({
      success: true,
      message: 'All active sessions on all devices have been logged out.',
      token: newToken,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const originalEmail = user.email;
    const originalName = user.name;

    // 1. Cancel upcoming user bookings with policy-compliant refunds
    const upcomingBookings = await Booking.find({
      userId: user._id,
      status: { $in: ['PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE'] },
    });

    const now = new Date();
    for (const booking of upcomingBookings) {
      const hoursUntilSlot = (new Date(booking.slotStart) - now) / (1000 * 60 * 60);
      let refundAmount = 0;
      if (hoursUntilSlot > 2) {
        refundAmount = booking.totalAmount;
      } else if (hoursUntilSlot > 0) {
        refundAmount = Math.round(booking.totalAmount * 0.5 * 100) / 100;
      }

      booking.status = 'CANCELLED';
      booking.cancellationReason = 'User requested permanent account deletion';
      booking.cancelledAt = now;
      booking.refundAmount = refundAmount;
      if (refundAmount > 0) {
        booking.paymentStatus = 'REFUNDED';
      }
      await booking.save();
    }

    // 2. If host, unlist their chargers
    await Charger.updateMany(
      { hostId: user._id },
      { $set: { status: 'REJECTED' } }
    );

    // 3. Anonymize user profile in compliance with DPDP Act 2023
    user.name = 'Deleted User';
    user.email = `deleted_${user._id}@chargeshare.local`;
    user.phone = '+910000000000';
    user.avatar = '';
    user.isDeleted = true;
    user.deletedAt = now;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all active tokens
    await user.save({ validateBeforeSave: false });

    // Send deletion confirmation email
    sendAccountDeletionEmail(originalEmail, originalName).catch((err) =>
      console.error('Account deletion email error:', err.message)
    );

    // Clear session cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Your account and personal data have been permanently deleted and anonymized in compliance with DPDP Act 2023.',
    });
  } catch (error) {
    next(error);
  }
};

export const adminChangeForcedPassword = adminRotatePassword;
