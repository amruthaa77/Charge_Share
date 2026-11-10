import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ADMIN_JWT_SECRET } from '../config/env.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { sendAdminNewDeviceLoginEmail } from '../services/email.service.js';

// Pre-computed dummy bcrypt hash to guarantee constant-time execution against timing attacks
const DUMMY_BCRYPT_HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

export const generateAdminToken = (id, tokenVersion = 0) => {
  return jwt.sign(
    {
      id,
      role: 'ADMIN',
      scope: 'admin',
      tokenVersion,
    },
    ADMIN_JWT_SECRET,
    {
      expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '30m',
    }
  );
};

export const sendAdminTokenResponse = (user, statusCode, res) => {
  const token = generateAdminToken(user._id, user.tokenVersion || 0);

  const cookieOptions = {
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8-hour maximum session lifetime
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  };

  // Dedicated admin session cookie, independent of rider/host session
  res.cookie('admin_session', token, cookieOptions);
  res.cookie('token', token, cookieOptions);

  return res.status(statusCode).json({
    success: true,
    token,
    admin_session: token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: 'ADMIN',
      avatar: user.avatar,
      city: user.city,
      trustStatus: user.trustStatus || 'VERIFIED',
      mustChangePassword: user.mustChangePassword || user.must_change_password || false,
      must_change_password: user.mustChangePassword || user.must_change_password || false,
    },
  });
};

/**
 * POST /api/v1/admin/auth/login
 * Strict administrative authentication portal.
 * Authenticates ONLY users with role === 'ADMIN'.
 * Returns identical neutral 401 for unknown email, non-admin role, or wrong password.
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const user = await User.findOne({
      email: normalizedEmail,
      isDeleted: { $ne: true },
    }).select('+password +failedLoginAttempts +lockUntil');

    // Case 1: Account does not exist -> Run dummy compare to prevent timing side-channels
    if (!user) {
      await bcrypt.compare(password || '', DUMMY_BCRYPT_HASH);
      await AuditLog.create({
        actorEmail: normalizedEmail || 'unknown',
        actorRole: 'UNKNOWN',
        action: 'ADMIN_LOGIN_FAILED',
        targetType: 'Auth',
        targetId: 'login_unknown',
        targetIdentifier: normalizedEmail,
        reason: 'ACCOUNT_NOT_FOUND',
        ipAddress: clientIp,
        userAgent,
      }).catch(() => {});

      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        requestId: req.id,
      });
    }

    // Case 2: Account exists but is NOT an ADMIN -> Run dummy compare to match response time
    if (user.role !== 'ADMIN') {
      await bcrypt.compare(password || '', DUMMY_BCRYPT_HASH);
      await AuditLog.create({
        actorId: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'ADMIN_LOGIN_FAILED',
        targetType: 'Auth',
        targetId: user._id.toString(),
        targetIdentifier: user.email,
        reason: 'ROLE_MISMATCH_NON_ADMIN',
        ipAddress: clientIp,
        userAgent,
      }).catch(() => {});

      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        requestId: req.id,
      });
    }

    // Case 3: Temporary Lockout check
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
        // In local development, auto-clear lock so developers never get blocked during interactive testing
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save({ validateBeforeSave: false });
      }
    }

    // Case 4: Suspension check
    if (user.trustStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: `Administrator account is suspended. Reason: ${user.trustReason || 'Security policy violation'}.`,
        requestId: req.id,
      });
    }

    // Case 5: Password verification
    let isMatch = await user.comparePassword(password);
    if (!isMatch && typeof password === 'string' && password.trim() !== password) {
      isMatch = await user.comparePassword(password.trim());
    }


    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
      }
      await user.save({ validateBeforeSave: false });

      await AuditLog.create({
        actorId: user._id,
        actorEmail: user.email,
        actorRole: 'ADMIN',
        action: 'ADMIN_LOGIN_FAILED',
        targetType: 'Auth',
        targetId: user._id.toString(),
        targetIdentifier: user.email,
        reason: 'INVALID_PASSWORD',
        metadata: {
          failedAttempts: user.failedLoginAttempts,
          locked: user.isLocked(),
        },
        ipAddress: clientIp,
        userAgent,
      }).catch(() => {});

      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
        requestId: req.id,
      });
    }

    // Case 6: Successful Authentication
    const isNewDevice =
      Boolean(user.lastLoginIp) &&
      (user.lastLoginIp !== clientIp || user.lastLoginUserAgent !== userAgent);

    if (isNewDevice) {
      sendAdminNewDeviceLoginEmail(user, {
        ip: clientIp,
        userAgent,
        timestamp: new Date().toISOString(),
      }).catch((emailErr) => {
        console.error('[AdminAuth] New device alert email notice:', emailErr.message);
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginIp = clientIp;
    user.lastLoginUserAgent = userAgent;
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      actorRole: 'ADMIN',
      action: 'ADMIN_LOGIN_SUCCESS',
      targetType: 'Auth',
      targetId: user._id.toString(),
      targetIdentifier: user.email,
      reason: 'Administrative session initialized via dedicated portal',
      metadata: { isNewDevice },
      ipAddress: clientIp,
      userAgent,
    }).catch(() => {});

    return sendAdminTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/password, POST /api/admin/rotate-password, POST /api/v1/admin/auth/change-password
 * Required forced rotation or self-service password update for admins.
 */
export const adminRotatePassword = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        code: 'UNAUTHENTICATED',
        message: 'Your admin session has expired. Sign in to the back-office again.',
        requestId: req.id,
      });
    }

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Forbidden: Only administrators can access this endpoint.',
        requestId: req.id,
      });
    }

    const candidate = req.body.newPassword || req.body.password;

    if (!candidate || typeof candidate !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'PASSWORD_REQUIRED',
        code: 'PASSWORD_REQUIRED',
        message: 'Password is required.',
        requestId: req.id,
      });
    }

    if (candidate.length < 12) {
      return res.status(400).json({
        success: false,
        error: 'PASSWORD_TOO_SHORT',
        code: 'PASSWORD_TOO_SHORT',
        message: 'Password must be at least 12 characters long.',
        requestId: req.id,
      });
    }

    if (!/[A-Z]/.test(candidate)) {
      return res.status(400).json({
        success: false,
        error: 'PASSWORD_NO_UPPERCASE',
        code: 'PASSWORD_NO_UPPERCASE',
        message: 'Password must contain at least one uppercase letter.',
        requestId: req.id,
      });
    }

    if (!/[a-z]/.test(candidate)) {
      return res.status(400).json({
        success: false,
        error: 'PASSWORD_NO_LOWERCASE',
        code: 'PASSWORD_NO_LOWERCASE',
        message: 'Password must contain at least one lowercase letter.',
        requestId: req.id,
      });
    }

    if (!/[0-9]/.test(candidate)) {
      return res.status(400).json({
        success: false,
        error: 'PASSWORD_NO_NUMBER',
        code: 'PASSWORD_NO_NUMBER',
        message: 'Password must contain at least one number.',
        requestId: req.id,
      });
    }

    // Accept all printable symbols including @ and .
    const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(candidate) || /[^\w\s]/.test(candidate);
    if (!hasSymbol) {
      return res.status(400).json({
        success: false,
        error: 'PASSWORD_NO_SYMBOL',
        code: 'PASSWORD_NO_SYMBOL',
        message: 'Password must contain at least one symbol (e.g. @, ., !, #, $).',
        requestId: req.id,
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        code: 'USER_NOT_FOUND',
        message: 'Administrator account not found.',
        requestId: req.id,
      });
    }

    const isSamePassword = await user.comparePassword(candidate);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'PASSWORD_IDENTICAL',
        code: 'PASSWORD_IDENTICAL',
        message: 'New password cannot be identical to the temporary password.',
        requestId: req.id,
      });
    }

    user.password = candidate;
    user.mustChangePassword = false;
    user.must_change_password = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all prior sessions
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      actorRole: 'ADMIN',
      action: 'ADMIN_PASSWORD_RESET',
      targetType: 'User',
      targetId: user._id.toString(),
      targetIdentifier: user.email,
      reason: 'Administrator initial password rotation completed successfully',
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    }).catch(() => {});

    return sendAdminTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const adminChangePassword = adminRotatePassword;

/**
 * POST /api/v1/admin/auth/logout
 * Terminates administrative session and clears admin_session httpOnly cookie.
 */
export const adminLogout = async (req, res) => {
  res.cookie('admin_session', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
    path: '/',
  });
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
    path: '/',
  });

  return res.status(200).json({
    success: true,
    message: 'Administrative session terminated.',
  });
};
