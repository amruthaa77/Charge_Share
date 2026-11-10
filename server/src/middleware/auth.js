import jwt from 'jsonwebtoken';
import { JWT_SECRET, ADMIN_JWT_SECRET } from '../config/env.js';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  const fullUrl = (req.originalUrl || req.url || req.baseUrl || req.path || '').toLowerCase();
  const isAdminPath = fullUrl.includes('/admin');
  const isHostStatsPath = fullUrl.includes('/host-stats');

  // Support separate admin_session cookie and X-Admin-Token header
  if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'];
  } else if (isAdminPath && !isHostStatsPath && req.cookies && req.cookies.admin_session) {
    token = req.cookies.admin_session;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.cookies && req.cookies.admin_session) {
    token = req.cookies.admin_session;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHENTICATED',
      code: 'UNAUTHENTICATED',
      message: 'Access denied. No authentication token provided.',
      requestId: req.id,
    });
  }

  try {
    let decoded = null;
    let isVerifiedAdmin = false;

    // Verify token with appropriate secret based on signature
    try {
      const dec = jwt.verify(token, ADMIN_JWT_SECRET);
      if (dec && (dec.scope === 'admin' || dec.role === 'ADMIN')) {
        decoded = dec;
        isVerifiedAdmin = true;
      }
    } catch {
      // Not an admin-signed token
    }

    if (!decoded) {
      try {
        const dec = jwt.verify(token, JWT_SECRET);
        if (dec && dec.scope !== 'admin' && dec.role !== 'ADMIN') {
          decoded = dec;
          isVerifiedAdmin = false;
        }
      } catch {
        // Not a user-signed token
      }
    }

    if (!decoded) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token.',
        requestId: req.id,
      });
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user || user.isDeleted) {
      return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        code: 'USER_NOT_FOUND',
        message: 'The user belonging to this token no longer exists or has been deactivated.',
        requestId: req.id,
      });
    }

    // Role-to-secret alignment: admin accounts require ADMIN_JWT_SECRET, user accounts require JWT_SECRET
    if (user.role === 'ADMIN' && !isVerifiedAdmin) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid administrative authentication token.',
        requestId: req.id,
      });
    }
    if (user.role !== 'ADMIN' && isVerifiedAdmin) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Administrative session token cannot be used for user accounts.',
        requestId: req.id,
      });
    }

    if (user.trustStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        code: 'ACCOUNT_SUSPENDED',
        message: `Account is suspended. Reason: ${user.trustReason || 'Policy violation'}.`,
        requestId: req.id,
      });
    }

    if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        error: 'SESSION_EXPIRED',
        code: 'SESSION_EXPIRED',
        message: 'Your session has expired due to a security update or password change. Please log in again.',
        requestId: req.id,
      });
    }

    // Role enforcement for admin routes: non-admin tokens receive 403 Forbidden
    // Note: /host-stats is a shared endpoint authorized for both HOST and ADMIN roles
    if (isAdminPath && !isHostStatsPath && user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        code: 'FORBIDDEN',
        message: 'Forbidden: Access restricted to platform administrators.',
        requestId: req.id,
      });
    }

    req.user = user;
    req.tokenScope = isVerifiedAdmin ? 'admin' : (decoded.scope || 'user');

    // Forced admin password rotation guard:
    // If mustChangePassword is true on an admin, only allow password change and logout endpoints
    if (user.role === 'ADMIN' && (user.mustChangePassword || user.must_change_password)) {
      const allowedRotationPaths = [
        'password',
        'change-password',
        'change-forced-password',
        'rotate-password',
        'admin-change-password',
        'logout',
        'auth/me',
        '/me',
      ];
      const isAllowedRotation = allowedRotationPaths.some((p) => fullUrl.includes(p));

      if (!isAllowedRotation) {
        return res.status(403).json({
          success: false,
          error: 'PASSWORD_CHANGE_REQUIRED',
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Administrative password rotation is required. Please set a new password to proceed.',
          mustChangePassword: true,
          must_change_password: true,
          requestId: req.id,
        });
      }
    }

    next();
  } catch {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired authentication token.',
      requestId: req.id,
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `Forbidden: User role '${req.user ? req.user.role : 'GUEST'}' is not authorized to access this route.`,
        requestId: req.id,
      });
    }

    // Strict Scope Claim Enforcement:
    // 1. Admin-only endpoints require administrative session scope
    if (roles.includes('ADMIN') && !roles.includes('EV_OWNER') && !roles.includes('HOST')) {
      if (req.tokenScope !== 'admin') {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Forbidden: Admin routes require an administrative session token (scope: admin).',
          requestId: req.id,
        });
      }
    }

    // 2. Non-admin routes reject administrative tokens
    if (!roles.includes('ADMIN')) {
      if (req.tokenScope === 'admin') {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Forbidden: Administrative session tokens cannot be used for rider or host marketplace operations.',
          requestId: req.id,
        });
      }
    }

    next();
  };
};
