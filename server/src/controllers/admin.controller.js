import { User } from '../models/User.js';
import { Charger } from '../models/Charger.js';
import { Booking } from '../models/Booking.js';
import { Verification } from '../models/Verification.js';
import { Report } from '../models/Report.js';
import { Contact } from '../models/Contact.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { APIError } from '../utils/errors.js';

// Helper to mask email (e.g. p***a@example.com)
export const maskEmail = (email = '') => {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name[0]}***${name.slice(-1)}@${domain}`;
};

// Helper to mask phone (e.g. +91 ••••• ••123)
export const maskPhone = (phone = '') => {
  if (!phone) return phone;
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length < 5) return cleaned;
  return `+91 ••••• ••${cleaned.slice(-3)}`;
};

/**
 * STEP 2: OVERVIEW STATS (Strictly computed from DB)
 */
export const getAdminStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User counts
    const [totalUsers, evOwnersCount, hostsCount, adminsCount, newUsers7d] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      User.countDocuments({ role: 'EV_OWNER', isDeleted: { $ne: true } }),
      User.countDocuments({ role: 'HOST', isDeleted: { $ne: true } }),
      User.countDocuments({ role: 'ADMIN', isDeleted: { $ne: true } }),
      User.countDocuments({ createdAt: { $gte: startOfWeek }, isDeleted: { $ne: true } }),
    ]);

    // Charger counts
    const [totalChargers, verifiedChargers, pendingChargers, rejectedChargers, suspendedChargers] =
      await Promise.all([
        Charger.countDocuments(),
        Charger.countDocuments({ status: 'VERIFIED' }),
        Charger.countDocuments({ status: 'PENDING_VERIFICATION' }),
        Charger.countDocuments({ status: 'REJECTED' }),
        Charger.countDocuments({ status: 'SUSPENDED' }),
      ]);

    // Pending KYC verifications & oldest pending item
    const pendingVerificationsCount = await Verification.countDocuments({ status: 'PENDING' });
    const oldestPending = await Verification.findOne({ status: 'PENDING' }).sort({ createdAt: 1 });
    let oldestWaitingHours = 0;
    if (oldestPending) {
      oldestWaitingHours = Math.round((now.getTime() - new Date(oldestPending.createdAt).getTime()) / (1000 * 60 * 60));
    }

    // Top areas with verified bays (computed dynamically from charger addresses)
    const areaAgg = await Charger.aggregate([
      { $match: { status: 'VERIFIED' } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);
    const topAreas = areaAgg.map((a) => a._id).filter(Boolean);

    // Bookings and financial counts
    const [
      totalBookings,
      bookingsToday,
      bookingsThisWeek,
      openReportsCount,
      failedPayments7d,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: startOfToday } }),
      Booking.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Report.countDocuments({ status: { $in: ['PENDING', 'INVESTIGATING'] } }),
      Booking.countDocuments({ paymentStatus: 'FAILED', createdAt: { $gte: startOfWeek } }),
    ]);

    // Revenue aggregations for paid bookings
    const revenueAgg = await Booking.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      {
        $group: {
          _id: null,
          grossMerchandiseValue: { $sum: '$totalAmount' },
          platformRevenue: { $sum: '$platformFee' },
          hostPayouts: { $sum: '$hostEarnings' },
        },
      },
    ]);
    const financial = revenueAgg[0] || {
      grossMerchandiseValue: 0,
      platformRevenue: 0,
      hostPayouts: 0,
    };

    // Total refunds issued
    const refundsAgg = await Booking.aggregate([
      { $match: { refundAmount: { $gt: 0 } } },
      { $group: { _id: null, totalRefunds: { $sum: '$refundAmount' }, count: { $sum: 1 } } },
    ]);
    const refundsIssued = refundsAgg[0]?.totalRefunds || 0;

    // 30-day Bookings per day trend chart data
    const dailyStats = await Booking.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          bookingsCount: { $sum: 1 },
          amount: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // "Needs Attention" actionable list
    const needsAttention = [];

    if (oldestWaitingHours >= 48) {
      needsAttention.push({
        id: 'kyc-overdue',
        severity: 'HIGH',
        category: 'KYC',
        title: `${pendingVerificationsCount} KYC verification(s) awaiting review`,
        description: `Oldest pending audit has been waiting for ${oldestWaitingHours} hours (> 48h SLA).`,
        link: '/admin/kyc',
        timestamp: oldestPending.createdAt,
      });
    }

    if (openReportsCount > 0) {
      const urgentReport = await Report.findOne({ status: { $in: ['PENDING', 'INVESTIGATING'] } })
        .populate('chargerId', 'title')
        .sort({ createdAt: -1 });

      needsAttention.push({
        id: 'open-reports',
        severity: 'MEDIUM',
        category: 'REPORT',
        title: `${openReportsCount} unresolved hardware defect report(s)`,
        description: urgentReport ? `Latest: "${urgentReport.reason}" on ${urgentReport.chargerId?.title || 'bay'}` : 'Requires inspection',
        link: '/admin/reports',
        timestamp: urgentReport?.createdAt || now,
      });
    }

    // Flagged users needing review
    const flaggedUsersCount = await User.countDocuments({
      trustStatus: { $in: ['FLAGGED', 'UNDER_REVIEW'] },
      isDeleted: { $ne: true },
    });
    if (flaggedUsersCount > 0) {
      needsAttention.push({
        id: 'flagged-users',
        severity: 'MEDIUM',
        category: 'USER',
        title: `${flaggedUsersCount} account(s) under security review or flagged`,
        description: 'Review risk signals and determine account standing.',
        link: '/admin/users?trustStatus=FLAGGED',
        timestamp: now,
      });
    }

    if (failedPayments7d > 0) {
      needsAttention.push({
        id: 'failed-payments',
        severity: 'LOW',
        category: 'PAYMENT',
        title: `${failedPayments7d} failed payment attempts in the last 7 days`,
        description: 'Investigate payment gateway errors or user drop-offs.',
        link: '/admin/payments',
        timestamp: now,
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          evOwners: evOwnersCount,
          hosts: hostsCount,
          admins: adminsCount,
          newLast7Days: newUsers7d,
        },
        chargers: {
          total: totalChargers,
          verified: verifiedChargers,
          pending: pendingChargers,
          rejected: rejectedChargers,
          suspended: suspendedChargers,
          topAreas,
        },
        verifications: {
          pending: pendingVerificationsCount,
          oldestWaitingHours,
        },
        bookings: {
          total: totalBookings,
          today: bookingsToday,
          thisWeek: bookingsThisWeek,
        },
        financial: {
          grossBookingValue: financial.grossMerchandiseValue,
          platformRevenue: financial.platformRevenue,
          hostPayouts: financial.hostPayouts,
          refundsIssued,
        },
        reports: {
          open: openReportsCount,
        },
        payments: {
          failedLast7Days: failedPayments7d,
        },
        trends30Days: dailyStats,
        needsAttention,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * STEP 4: USERS LIST & LEGITIMACY REVIEW
 */
export const listAllUsersAdmin = async (req, res, next) => {
  try {
    const {
      role,
      trustStatus,
      emailVerified,
      phoneVerified,
      search,
      page = 1,
      limit = 20,
      sort = 'newest',
    } = req.query;

    const query = { isDeleted: { $ne: true } };

    if (role && role !== 'ALL') query.role = role;
    if (trustStatus && trustStatus !== 'ALL') query.trustStatus = trustStatus;
    if (emailVerified !== undefined && emailVerified !== '') query.emailVerified = emailVerified === 'true';
    if (phoneVerified !== undefined && phoneVerified !== '') query.phoneVerified = phoneVerified === 'true';

    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { email: { $regex: new RegExp(search, 'i') } },
        { phone: { $regex: new RegExp(search, 'i') } },
      ];
    }

    const sortOption = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const users = await User.find(query)
      .sort(sortOption)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    // Compute metrics and risk signals for each user
    const usersWithSignals = await Promise.all(
      users.map(async (u) => {
        const userId = u._id;
        const [bookingsCount, cancelledCount, failedPaymentsCount, reportsCount, kycDoc] =
          await Promise.all([
            Booking.countDocuments({ userId }),
            Booking.countDocuments({ userId, status: 'CANCELLED' }),
            Booking.countDocuments({ userId, paymentStatus: 'FAILED' }),
            Report.countDocuments({ reporterId: userId }),
            Verification.findOne({ hostId: userId }).sort({ createdAt: -1 }),
          ]);

        const cancellationRate = bookingsCount > 0 ? Math.round((cancelledCount / bookingsCount) * 100) : 0;

        // Risk signals calculation
        const signals = [];
        if (!u.emailVerified) signals.push({ code: 'UNVERIFIED_EMAIL', label: 'Email Unverified', severity: 'WARN' });
        if (!u.phoneVerified) signals.push({ code: 'UNVERIFIED_PHONE', label: 'Phone Unverified', severity: 'WARN' });

        const disposableDomains = ['tempmail.com', 'mailinator.com', '10minutemail.com', 'throwaway.com'];
        const domain = (u.email || '').split('@')[1];
        if (domain && disposableDomains.includes(domain.toLowerCase())) {
          signals.push({ code: 'DISPOSABLE_EMAIL', label: 'Disposable Email Domain', severity: 'HIGH' });
        }

        if (u.failedLoginAttempts >= 3) {
          signals.push({ code: 'FAILED_LOGINS', label: `${u.failedLoginAttempts} Failed Logins`, severity: 'WARN' });
        }

        if (bookingsCount >= 3 && cancellationRate >= 40) {
          signals.push({ code: 'HIGH_CANCELLATIONS', label: `${cancellationRate}% Cancel Rate`, severity: 'HIGH' });
        }

        if (failedPaymentsCount >= 2) {
          signals.push({ code: 'PAYMENT_FAILURES', label: `${failedPaymentsCount} Payment Failures`, severity: 'WARN' });
        }

        if (kycDoc && kycDoc.status === 'REJECTED') {
          signals.push({ code: 'KYC_REJECTED', label: 'Prior KYC Rejected', severity: 'HIGH' });
        }

        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          maskedEmail: maskEmail(u.email),
          phone: u.phone,
          maskedPhone: maskPhone(u.phone),
          role: u.role,
          avatar: u.avatar,
          city: u.city,
          trustStatus: u.trustStatus || 'UNVERIFIED',
          trustReason: u.trustReason || '',
          emailVerified: u.emailVerified || false,
          phoneVerified: u.phoneVerified || false,
          isVerifiedHost: u.isVerifiedHost || false,
          kycStatus: kycDoc ? kycDoc.status : (u.role === 'HOST' ? 'NOT_SUBMITTED' : 'NOT_APPLICABLE'),
          bookingsCount,
          cancellationRate,
          reportsCount,
          signals,
          createdAt: u.createdAt,
          lastActive: u.lastActive,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: usersWithSignals.length,
      total,
      users: usersWithSignals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * USER DETAIL VIEW
 */
export const getAdminUserDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || user.isDeleted) {
      throw APIError.notFound('User not found');
    }

    const { Vehicle } = await import('../models/Vehicle.js');

    const [vehicles, chargers, bookings, reportsBy, reportsAgainst, auditTrail, kycRecord] =
      await Promise.all([
        Vehicle.find({ userId: id }),
        Charger.find({ hostId: id }),
        Booking.find({ $or: [{ userId: id }, { hostId: id }] })
          .populate('chargerId', 'title address')
          .sort({ createdAt: -1 })
          .limit(10),
        Report.find({ reporterId: id }),
        Report.find({ chargerId: { $in: await Charger.find({ hostId: id }).distinct('_id') } }),
        AuditLog.find({ targetId: id.toString() }).sort({ createdAt: -1 }).limit(20),
        Verification.findOne({ hostId: id }).sort({ createdAt: -1 }),
      ]);

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        maskedEmail: maskEmail(user.email),
        phone: user.phone,
        maskedPhone: maskPhone(user.phone),
        role: user.role,
        avatar: user.avatar,
        city: user.city,
        trustStatus: user.trustStatus || 'UNVERIFIED',
        trustReason: user.trustReason || '',
        trustUpdatedAt: user.trustUpdatedAt,
        trustUpdatedBy: user.trustUpdatedBy,
        emailVerified: user.emailVerified || false,
        phoneVerified: user.phoneVerified || false,
        isVerifiedHost: user.isVerifiedHost || false,
        adminNotes: user.adminNotes || [],
        createdAt: user.createdAt,
        lastActive: user.lastActive,
      },
      vehicles,
      chargers,
      recentBookings: bookings,
      reportsBy,
      reportsAgainst,
      auditTrail,
      kycRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE USER TRUST STATUS (UNDER_REVIEW, FLAGGED, SUSPENDED, VERIFIED)
 */
export const updateUserTrustStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trustStatus, reason } = req.body;

    if (!['UNVERIFIED', 'VERIFIED', 'UNDER_REVIEW', 'FLAGGED', 'SUSPENDED'].includes(trustStatus)) {
      throw APIError.badRequest('Invalid trust status');
    }

    if (!reason || reason.trim().length < 5) {
      throw APIError.badRequest('A reason of at least 5 characters is required to update trust status');
    }

    const targetUser = await User.findById(id);
    if (!targetUser || targetUser.isDeleted) {
      throw APIError.notFound('User not found');
    }

    // Safety checks: Cannot suspend self
    if (targetUser._id.toString() === req.user._id.toString() && trustStatus === 'SUSPENDED') {
      throw APIError.badRequest('Admins cannot suspend their own account.');
    }

    // Safety check: Cannot suspend the last active admin
    if (targetUser.role === 'ADMIN' && trustStatus === 'SUSPENDED') {
      const activeAdminCount = await User.countDocuments({
        role: 'ADMIN',
        trustStatus: { $ne: 'SUSPENDED' },
        isDeleted: { $ne: true },
      });
      if (activeAdminCount <= 1) {
        throw APIError.badRequest('Cannot suspend the only remaining active administrator.');
      }
    }

    const previousStatus = targetUser.trustStatus;
    targetUser.trustStatus = trustStatus;
    targetUser.trustReason = reason.trim();
    targetUser.trustUpdatedAt = new Date();
    targetUser.trustUpdatedBy = req.user._id;

    // If suspended, invalidate all user sessions
    if (trustStatus === 'SUSPENDED') {
      targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
    }

    await targetUser.save();

    // Create Audit Log
    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: 'ADMIN',
      action: trustStatus === 'SUSPENDED' ? 'USER_SUSPEND' : 'USER_TRUST_CHANGE',
      targetType: 'User',
      targetId: targetUser._id.toString(),
      targetIdentifier: targetUser.email,
      reason: reason.trim(),
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      metadata: { previousStatus, newStatus: trustStatus },
    });

    // Notify User
    await Notification.create({
      userId: targetUser._id,
      type: 'SYSTEM',
      title: `Account Status Update: ${trustStatus}`,
      message: `Your account standing has been marked as ${trustStatus}. Reason: ${reason.trim()}`,
    });

    res.status(200).json({
      success: true,
      message: `User trust status updated to ${trustStatus}.`,
      user: {
        _id: targetUser._id,
        trustStatus: targetUser.trustStatus,
        trustReason: targetUser.trustReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADD INTERNAL ADMIN NOTE
 */
export const addUserAdminNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || note.trim().length === 0) {
      throw APIError.badRequest('Note content cannot be empty.');
    }

    const user = await User.findById(id);
    if (!user || user.isDeleted) {
      throw APIError.notFound('User not found');
    }

    user.adminNotes = user.adminNotes || [];
    user.adminNotes.push({
      text: note.trim(),
      author: req.user._id,
      authorName: req.user.name || 'Admin',
      createdAt: new Date(),
    });
    await user.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: 'ADMIN',
      action: 'USER_NOTE_ADD',
      targetType: 'User',
      targetId: user._id.toString(),
      targetIdentifier: user.email,
      reason: 'Admin internal note added',
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: 'Admin note appended successfully.',
      adminNotes: user.adminNotes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CSV EXPORT OF USERS LIST (Audited)
 */
export const exportUsersCSV = async (req, res, next) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true } })
      .select('name email phone role trustStatus isVerifiedHost createdAt')
      .sort({ createdAt: -1 });

    const csvHeaders = 'Name,Email,Phone,Role,Trust Status,Verified Host,Created At\n';
    const csvRows = users
      .map(
        (u) =>
          `"${u.name.replace(/"/g, '""')}","${u.email}","${u.phone}","${u.role}","${u.trustStatus || 'UNVERIFIED'}","${u.isVerifiedHost ? 'YES' : 'NO'}","${u.createdAt.toISOString()}"`
      )
      .join('\n');

    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: 'ADMIN',
      action: 'DATA_EXPORT',
      targetType: 'User',
      targetId: 'ALL',
      targetIdentifier: `Export ${users.length} users`,
      reason: 'Admin CSV export of platform users',
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="chargeshare_users_export.csv"');
    res.status(200).send(csvHeaders + csvRows);
  } catch (error) {
    next(error);
  }
};

/**
 * STEP 5: LISTINGS MANAGEMENT (Suspend / Relist)
 */
export const listAllChargersAdmin = async (req, res, next) => {
  try {
    const { status, city, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'ALL') query.status = status;
    if (city) query.city = { $regex: new RegExp(city, 'i') };
    if (search) {
      query.$or = [
        { title: { $regex: new RegExp(search, 'i') } },
        { address: { $regex: new RegExp(search, 'i') } },
      ];
    }

    const chargers = await Charger.find(query)
      .populate('hostId', 'name email phone avatar trustStatus')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Charger.countDocuments(query);

    res.status(200).json({
      success: true,
      count: chargers.length,
      total,
      chargers,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleChargerSuspendAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body || {}; // action: 'suspend' or 'relist'
    const targetAction = action || ((req.originalUrl && req.originalUrl.includes('/relist')) || (req.path && req.path.includes('/relist')) ? 'relist' : 'suspend');

    const charger = await Charger.findById(id).populate('hostId');
    if (!charger) {
      throw APIError.notFound('Charger not found');
    }

    if (targetAction === 'suspend') {
      if (!reason || reason.trim().length < 5) {
        throw APIError.badRequest('A reason of at least 5 characters is required to suspend a listing.');
      }
      charger.status = 'SUSPENDED';
      charger.adminSuspendReason = reason.trim();
      charger.adminSuspendedAt = new Date();
      charger.adminSuspendedBy = req.user._id;
      await charger.save();

      await Notification.create({
        userId: charger.hostId._id,
        type: 'SYSTEM',
        title: 'Charging Bay Suspended',
        message: `Your bay "${charger.title}" was suspended by admin. Reason: ${reason.trim()}`,
      });

      await AuditLog.create({
        actorId: req.user._id,
        actorEmail: req.user.email,
        actorRole: 'ADMIN',
        action: 'LISTING_SUSPEND',
        targetType: 'Charger',
        targetId: charger._id.toString(),
        targetIdentifier: charger.title,
        reason: reason.trim(),
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });

      return res.status(200).json({
        success: true,
        message: 'Charger listing has been suspended.',
        charger,
      });
    }

    if (targetAction === 'relist') {
      charger.status = 'VERIFIED';
      charger.adminSuspendReason = '';
      await charger.save();

      await Notification.create({
        userId: charger.hostId._id,
        type: 'SYSTEM',
        title: 'Charging Bay Re-listed',
        message: `Your bay "${charger.title}" is now re-listed and active on the network.`,
      });

      await AuditLog.create({
        actorId: req.user._id,
        actorEmail: req.user.email,
        actorRole: 'ADMIN',
        action: 'LISTING_RELIST',
        targetType: 'Charger',
        targetId: charger._id.toString(),
        targetIdentifier: charger.title,
        reason: (reason && reason.trim()) || 'Re-listed by administrator after compliance confirmation',
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });

      return res.status(200).json({
        success: true,
        message: 'Charger listing has been re-listed as VERIFIED.',
        charger,
      });
    }

    throw APIError.badRequest('Invalid action');
  } catch (error) {
    next(error);
  }
};

/**
 * STEP 5: BOOKINGS & PAYMENTS
 */
export const listAllBookingsAdmin = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'ALL') query.status = status;
    if (search) {
      query.$or = [{ bookingCode: { $regex: new RegExp(search, 'i') } }];
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'name email phone')
      .populate('hostId', 'name email phone')
      .populate('chargerId', 'title address city')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingDetailAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate('userId', 'name email phone avatar')
      .populate('hostId', 'name email phone avatar')
      .populate('chargerId')
      .populate('vehicleId');

    if (!booking) {
      throw APIError.notFound('Booking not found');
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

export const listAllPaymentsAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const query = { paymentStatus: { $in: ['PAID', 'REFUNDED', 'FAILED'] } };

    const payments = await Booking.find(query)
      .populate('userId', 'name email')
      .populate('hostId', 'name email')
      .populate('chargerId', 'title')
      .select('bookingCode totalAmount platformFee hostEarnings paymentStatus razorpayOrderId razorpayPaymentId refundAmount createdAt')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * STEP 5: REPORTS & DISPUTES
 */
export const listReportsAdmin = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status && status !== 'ALL') query.status = status;

    const reports = await Report.find(query)
      .populate('reporterId', 'name email phone')
      .populate({
        path: 'chargerId',
        populate: { path: 'hostId', select: 'name email phone' },
      })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reports.length,
      total,
      reports,
    });
  } catch (error) {
    next(error);
  }
};

export const resolveReportAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status = 'RESOLVED', adminNotes = '' } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      throw APIError.notFound('Report not found');
    }

    report.status = status;
    report.adminNotes = adminNotes;
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    await report.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: 'ADMIN',
      action: 'REPORT_RESOLVE',
      targetType: 'Report',
      targetId: report._id.toString(),
      targetIdentifier: report.reason,
      reason: adminNotes || 'Resolved after inspection',
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: `Report marked as ${status}.`,
      report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * STEP 5: CONTACT INQUIRIES & MESSAGES
 */
export const listContactMessagesAdmin = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status && status !== 'ALL') query.status = status;

    const messages = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Contact.countDocuments(query);

    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

export const updateContactStatusAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'NEW', 'IN_REVIEW', 'RESOLVED'

    const contact = await Contact.findById(id);
    if (!contact) {
      throw APIError.notFound('Message not found');
    }

    contact.status = status;
    await contact.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: 'ADMIN',
      action: 'CONTACT_STATUS_CHANGE',
      targetType: 'Contact',
      targetId: contact._id.toString(),
      targetIdentifier: contact.subject,
      reason: `Contact status updated to ${status}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(200).json({
      success: true,
      message: `Message status updated to ${status}`,
      contact,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * STEP 5: AUDIT LOGS (Read-only for Admins)
 */
export const getAuditLogsAdmin = async (req, res, next) => {
  try {
    const { action, targetType, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (action && action !== 'ALL') query.action = action;
    if (targetType && targetType !== 'ALL') query.targetType = targetType;
    if (search) {
      query.$or = [
        { actorEmail: { $regex: new RegExp(search, 'i') } },
        { targetIdentifier: { $regex: new RegExp(search, 'i') } },
        { reason: { $regex: new RegExp(search, 'i') } },
      ];
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * STEP 6: CREATE / INVITE ADMIN
 */
export const createAdminUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw APIError.badRequest('Name, email, and password are required');
    }

    if (password.length < 12) {
      throw APIError.badRequest('Admin password must be at least 12 characters');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      throw APIError.conflict('A user with this email address already exists');
    }

    const newAdmin = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: '+919999900099',
      role: 'ADMIN',
      city: 'Bengaluru',
      mustChangePassword: true,
      trustStatus: 'VERIFIED',
      emailVerified: true,
      phoneVerified: true,
    });

    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: 'ADMIN',
      action: 'ADMIN_CREATE',
      targetType: 'User',
      targetId: newAdmin._id.toString(),
      targetIdentifier: newAdmin.email,
      reason: 'New administrator provisioned by existing admin',
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(201).json({
      success: true,
      message: 'New administrator created successfully. Forced password rotation enabled for first login.',
      admin: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        mustChangePassword: newAdmin.mustChangePassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * HOST DASHBOARD STATS (Unchanged backwards compatibility)
 */
export const getHostDashboardStats = async (req, res, next) => {
  try {
    const hostId = req.user._id;

    const chargers = await Charger.find({ hostId });
    const bookings = await Booking.find({ hostId }).populate('chargerId', 'title address');

    const totalEarnings = bookings
      .filter((b) => b.paymentStatus === 'PAID')
      .reduce((sum, b) => sum + b.hostEarnings, 0);

    const upcomingBookings = bookings.filter(
      (b) => b.status === 'CONFIRMED' && new Date(b.slotEnd).getTime() >= Date.now()
    );

    const completedBookings = bookings.filter(
      (b) => b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && new Date(b.slotEnd).getTime() < Date.now())
    );

    const totalPossibleSlotsMonth = Math.max(chargers.length * 30 * 8, 1);
    const bookedSlotsMonth = bookings.filter(
      (b) => ['CONFIRMED', 'COMPLETED'].includes(b.status) &&
             new Date(b.createdAt).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000
    ).length;
    const utilisationPercent = Math.min(Math.round((bookedSlotsMonth / totalPossibleSlotsMonth) * 100), 100);

    const monthlyEarningsAgg = await Booking.aggregate([
      {
        $match: {
          hostId,
          paymentStatus: 'PAID',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          earnings: { $sum: '$hostEarnings' },
          bookingsCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalEarnings,
        totalChargers: chargers.length,
        totalBookings: bookings.length,
        upcomingBookingsCount: upcomingBookings.length,
        completedBookingsCount: completedBookings.length,
        utilisationPercent,
        monthlyEarnings: monthlyEarningsAgg,
        recentBookings: bookings.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};
