import express from 'express';
import { User } from '../models/User.js';
import {
  getAdminStats,
  listAllChargersAdmin,
  toggleChargerSuspendAdmin,
  listAllUsersAdmin,
  getAdminUserDetail,
  updateUserTrustStatus,
  addUserAdminNote,
  exportUsersCSV,
  listAllBookingsAdmin,
  getBookingDetailAdmin,
  listAllPaymentsAdmin,
  listReportsAdmin,
  resolveReportAdmin,
  listContactMessagesAdmin,
  updateContactStatusAdmin,
  getAuditLogsAdmin,
  createAdminUser,
  getHostDashboardStats,
} from '../controllers/admin.controller.js';
import { adminChangeForcedPassword } from '../controllers/auth.controller.js';
import {
  adminLogin,
  adminChangePassword,
  adminRotatePassword,
  adminLogout,
} from '../controllers/admin.auth.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const isTesting = process.env.NODE_ENV === 'test';
export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter =
      Math.ceil(((req.rateLimit?.resetTime?.getTime() || Date.now() + 15 * 60 * 1000) - Date.now()) / 1000) || 900;
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many administrative authentication attempts from this IP. Please try again after 15 minutes.',
      retryAfter,
      requestId: req.id,
    });
  },
});

const router = express.Router();

// =========================================================================
// PUBLIC ADMIN AUTHENTICATION (Unauthenticated)
// =========================================================================
router.post('/auth/login', adminAuthLimiter, adminLogin);

// =========================================================================
// PROTECTED BACK-OFFICE ROUTES (Requires Session)
// =========================================================================
router.use(protect);

// Shared metrics for host dashboard and admin back-office
router.get('/host-stats', authorize('HOST', 'ADMIN'), getHostDashboardStats);

// Enforce admin access on the server by role for every /api/admin/* route.
// Riders and hosts receive 403 on these routes even if they are logged in.
router.use((req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      code: 'FORBIDDEN',
      message: 'Forbidden: Access restricted to platform administrators.',
      requestId: req.id,
    });
  }
  next();
});

// Admin Password Rotation Endpoints (Accepts PUT /api/admin/password, POST /api/admin/rotate-password)
router.put('/password', adminRotatePassword);
router.post('/rotate-password', adminRotatePassword);
router.post('/change-forced-password', adminRotatePassword);
router.post('/auth/change-password', adminRotatePassword);
router.post('/auth/logout', adminLogout);

if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/reset-rotation-flag', async (req, res) => {
    try {
      const admin = await User.findById(req.user._id);
      if (admin) {
        admin.mustChangePassword = true;
        admin.must_change_password = true;
        await admin.save({ validateBeforeSave: false });
      }
      return res.json({ success: true, mustChangePassword: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
}

// Strict Admin-only endpoints
router.get('/stats', getAdminStats);

// Users management
router.get('/users/export/csv', exportUsersCSV);
router.get('/users/export.csv', exportUsersCSV);
router.get('/users', listAllUsersAdmin);
router.get('/users/:id', getAdminUserDetail);
router.patch('/users/:id/trust', updateUserTrustStatus);
router.post('/users/:id/notes', addUserAdminNote);

// Listings management
router.get('/chargers', listAllChargersAdmin);
router.patch('/chargers/:id/suspend', toggleChargerSuspendAdmin);
router.patch('/chargers/:id/relist', toggleChargerSuspendAdmin);

// Bookings & Payments
router.get('/bookings', listAllBookingsAdmin);
router.get('/bookings/:id', getBookingDetailAdmin);
router.get('/payments', listAllPaymentsAdmin);

// Reports & Contact
router.get('/reports', listReportsAdmin);
router.patch('/reports/:id', resolveReportAdmin);
router.get('/contact', listContactMessagesAdmin);
router.patch('/contact/:id', updateContactStatusAdmin);

// Audit logs
router.get('/audit', getAuditLogsAdmin);
router.get('/audit-logs', getAuditLogsAdmin);

// Admin provisioning
router.post('/admins', createAdminUser);

export default router;
