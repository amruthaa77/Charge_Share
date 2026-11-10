import QRCode from 'qrcode';
import { Booking } from '../models/Booking.js';
import { Charger } from '../models/Charger.js';
import { Notification } from '../models/Notification.js';
import { createRazorpayOrder, verifyPaymentSignature, processRefund } from '../services/payment.service.js';

// Helper to generate a unique readable booking reference
const generateBookingCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CS-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += '-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

/**
 * Create a booking (Immediate Book Now, Reservation, or Emergency SOS)
 * Protected by atomic overlap query AND DB unique partial index against race conditions.
 */
export const createBooking = async (req, res, next) => {
  try {
    const {
      chargerId,
      vehicleId,
      slotStart,
      durationMinutes = 60,
      bookingType = 'INSTANT',
      isEmergency = false,
      emergencyDetails = {},
    } = req.body;
    const userId = req.user._id;

    const charger = await Charger.findById(chargerId).populate('hostId', 'name phone email');
    if (!charger) {
      return res.status(404).json({
        success: false,
        code: 'CHARGER_NOT_FOUND',
        message: 'Charger listing not found',
        requestId: req.id,
      });
    }

    if (charger.status !== 'VERIFIED') {
      return res.status(400).json({
        success: false,
        code: 'CHARGER_UNAVAILABLE',
        message: 'This charger is not currently verified or available for booking',
        requestId: req.id,
      });
    }

    // Security check: Host cannot book their own charger
    if (charger.hostId._id.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        code: 'CANNOT_BOOK_OWN_CHARGER',
        message: 'You cannot book your own charger listing.',
        requestId: req.id,
      });
    }

    // Determine start and end time
    const start = slotStart ? new Date(slotStart) : new Date();
    if (isNaN(start.getTime()) || start.getTime() < Date.now() - 5 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        code: 'SLOT_IN_PAST',
        message: 'Slot start time cannot be in the past.',
        errors: [{ field: 'slotStart', message: 'Slot start time cannot be in the past.' }],
        requestId: req.id,
      });
    }

    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    // Atomic overlap check: prevent double booking across entire duration window
    const overlapping = await Booking.findOne({
      chargerId: charger._id,
      status: { $in: ['PENDING_PAYMENT', 'CONFIRMED', 'PENDING_APPROVAL', 'ACTIVE'] },
      slotStart: { $lt: end },
      slotEnd: { $gt: start },
    });

    if (overlapping) {
      return res.status(409).json({
        success: false,
        code: 'SLOT_TAKEN',
        message: 'This charging slot is already booked or currently reserved. Please choose another slot.',
        nextAvailableAt: overlapping.slotEnd,
        requestId: req.id,
      });
    }

    // Calculate pricing
    const durationHours = durationMinutes / 60;
    let baseAmount = 0;
    if (charger.pricingType === 'PER_HOUR') {
      baseAmount = Math.round(charger.price * durationHours);
    } else {
      // PER_KWH: Estimate kWh based on charger power
      const estimatedKWh = Math.round(charger.powerKW * durationHours * 0.85);
      baseAmount = Math.round(charger.price * Math.max(estimatedKWh, 1));
    }

    const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT) || 5;
    const platformFee = Math.round((baseAmount * platformFeePercent) / 100);
    const totalAmount = baseAmount + platformFee;
    const hostEarnings = baseAmount; // Host keeps 100% of base fee, user pays platform fee

    const bookingCode = generateBookingCode();
    const heldUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes hold

    // Status logic: if station owner requires pre-approval and it's not emergency instant
    const needsApproval = charger.requiresApproval || charger.availabilityMode === 'REQUEST_APPROVAL';
    const initialStatus = needsApproval && !isEmergency ? 'PENDING_APPROVAL' : 'PENDING_PAYMENT';

    const actualBookingType = isEmergency ? 'EMERGENCY' : bookingType;

    // Audit log entry
    const auditLog = [
      {
        action: 'CREATED',
        performedBy: userId,
        role: 'EV_OWNER',
        timestamp: new Date(),
        note: isEmergency
          ? `Emergency SOS booking initiated (${emergencyDetails.batteryPercent || 10}% battery)`
          : needsApproval
          ? 'Booking request submitted pending host approval'
          : 'Instant booking hold initiated',
      },
    ];

    let booking;
    try {
      booking = await Booking.create({
        bookingCode,
        userId,
        hostId: charger.hostId._id,
        chargerId: charger._id,
        vehicleId: vehicleId || undefined,
        bookingType: actualBookingType,
        isEmergency: Boolean(isEmergency),
        emergencyDetails: isEmergency ? emergencyDetails : undefined,
        slotStart: start,
        slotEnd: end,
        durationMinutes,
        baseAmount,
        platformFee,
        totalAmount,
        hostEarnings,
        idleFeePerMinute: charger.idleFeePerMinute || 2,
        status: initialStatus,
        paymentStatus: 'PENDING',
        heldUntil,
        auditLog,
      });
    } catch (dbError) {
      // 11000 duplicate key error indicates concurrent reservation race
      if (dbError.code === 11000 || dbError.message.includes('chargerId_1_slotStart_1')) {
        return res.status(409).json({
          success: false,
          code: 'SLOT_TAKEN',
          message: 'This charging slot is already booked or currently reserved. Please choose another slot.',
          requestId: req.id,
        });
      }
      throw dbError;
    }

    // Generate Razorpay or Mock Order
    const orderData = await createRazorpayOrder({
      amountInINR: totalAmount,
      receipt: booking.bookingCode,
      notes: {
        bookingId: booking._id.toString(),
        chargerId: charger._id.toString(),
      },
    });

    booking.razorpayOrderId = orderData.orderId;
    await booking.save();

    // Send notifications to Host
    if (isEmergency) {
      await Notification.create({
        userId: charger.hostId._id,
        title: '🚨 CRITICAL: Emergency Charging SOS Request!',
        message: `${req.user.name || 'An EV Driver'} needs emergency charging immediately. Battery at ${emergencyDetails.batteryPercent || '<10'}%!`,
        type: 'EMERGENCY_REQUEST',
        isEmergency: true,
        data: {
          bookingId: booking._id,
          chargerId: charger._id,
          metadata: {
            batteryPercent: emergencyDetails.batteryPercent,
            vehicleModel: emergencyDetails.vehicleModel,
            userPhone: req.user.phone,
          },
        },
      });
    } else if (needsApproval) {
      await Notification.create({
        userId: charger.hostId._id,
        title: 'New Booking Request Awaiting Approval',
        message: `${req.user.name || 'A driver'} requested to book ${charger.title} for ${durationMinutes} mins.`,
        type: 'SYSTEM',
        data: {
          bookingId: booking._id,
          chargerId: charger._id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: needsApproval && !isEmergency
        ? 'Booking request submitted! Waiting for host approval.'
        : isEmergency
        ? 'Emergency SOS request dispatched to host!'
        : 'Slot held for 10 minutes. Please complete payment to confirm.',
      booking,
      payment: orderData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm booking after payment
 */
export const confirmBooking = async (req, res, next) => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, isMock } = req.body;

    const booking = await Booking.findById(bookingId).populate('chargerId').populate('hostId', 'name phone email');
    if (!booking) {
      return res.status(404).json({
        success: false,
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking not found',
        requestId: req.id,
      });
    }

    if (booking.userId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Not authorized to confirm this booking',
        requestId: req.id,
      });
    }

    if (booking.status === 'CONFIRMED') {
      return res.status(200).json({
        success: true,
        message: 'Booking is already confirmed',
        booking,
      });
    }

    if (booking.status === 'CANCELLED' || booking.heldUntil < new Date()) {
      return res.status(400).json({
        success: false,
        code: 'HOLD_EXPIRED',
        message: 'This booking hold has expired or was cancelled. Please book the slot again.',
        requestId: req.id,
      });
    }

    // Verify payment signature
    const isValid = verifyPaymentSignature({
      razorpayOrderId: razorpayOrderId || booking.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      isMock,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        code: 'PAYMENT_FAILED',
        message: 'Payment verification failed. Invalid transaction signature.',
        requestId: req.id,
      });
    }

    // Generate check-in QR Code
    const qrData = JSON.stringify({
      code: booking.bookingCode,
      bookingId: booking._id,
      chargerId: booking.chargerId._id,
      slotStart: booking.slotStart,
      verified: true,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      margin: 2,
      width: 256,
      color: {
        dark: '#0B1220',
        light: '#FFFFFF',
      },
    });

    booking.status = 'CONFIRMED';
    booking.paymentStatus = 'PAID';
    booking.razorpayPaymentId = razorpayPaymentId || `pay_mock_${Date.now()}`;
    booking.razorpaySignature = razorpaySignature || 'mock_signature_verified';
    booking.qrCodeDataUrl = qrCodeDataUrl;

    // Append to audit log
    booking.auditLog.push({
      action: 'CONFIRMED',
      performedBy: req.user._id,
      role: req.user.role,
      timestamp: new Date(),
      note: 'Payment successfully verified. Booking confirmed with QR check-in token.',
    });

    await booking.save();

    // Dispatch confirmation notification to EV owner
    await Notification.create({
      userId: booking.userId,
      title: 'Booking Confirmed!',
      message: `Your charging session at ${booking.chargerId.title} is confirmed. Booking code: ${booking.bookingCode}.`,
      type: 'BOOKING_CONFIRMED',
      data: {
        bookingId: booking._id,
        chargerId: booking.chargerId._id,
      },
    });

    // Notify host
    await Notification.create({
      userId: booking.hostId._id,
      title: 'Payment Received — Booking Confirmed',
      message: `Driver paid for slot starting at ${new Date(booking.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      type: 'BOOKING_CONFIRMED',
      data: {
        bookingId: booking._id,
        chargerId: booking.chargerId._id,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Booking successfully confirmed!',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List current user's bookings (EV Owner or Host)
 */
export const getMyBookings = async (req, res, next) => {
  try {
    const { status, type = 'user', isEmergency } = req.query;
    const query = type === 'host' ? { hostId: req.user._id } : { userId: req.user._id };

    if (isEmergency !== undefined) {
      query.isEmergency = isEmergency === 'true' || isEmergency === true;
    }

    if (status) {
      if (status === 'UPCOMING') {
        query.status = { $in: ['CONFIRMED', 'PENDING_APPROVAL', 'ACTIVE'] };
        query.slotEnd = { $gte: new Date() };
      } else if (status === 'COMPLETED') {
        query.$or = [{ status: 'COMPLETED' }, { status: 'CONFIRMED', slotEnd: { $lt: new Date() } }];
      } else if (status === 'CANCELLED') {
        query.status = { $in: ['CANCELLED', 'REJECTED', 'EXPIRED'] };
      } else {
        query.status = status;
      }
    }

    const bookings = await Booking.find(query)
      .populate({
        path: 'chargerId',
        populate: { path: 'hostId', select: 'name email phone avatar isOnline expectedResponseTime' },
      })
      .populate('userId', 'name email phone avatar')
      .populate('hostId', 'name email phone avatar isOnline expectedResponseTime')
      .populate('vehicleId')
      .sort({ isEmergency: -1, slotStart: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking by ID
 */
export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'chargerId',
        populate: { path: 'hostId', select: 'name email phone avatar isOnline expectedResponseTime' },
      })
      .populate('userId', 'name email phone avatar')
      .populate('hostId', 'name email phone avatar isOnline expectedResponseTime')
      .populate('vehicleId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Access control
    const isOwner = booking.userId._id.toString() === req.user.id;
    const isHost = booking.hostId._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking',
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel booking with tiered refund logic & audit logging
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    const booking = await Booking.findById(id).populate('chargerId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isOwner = booking.userId.toString() === req.user.id;
    const isHost = booking.hostId.toString() === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status.toLowerCase()}`,
      });
    }

    const now = new Date();
    const slotStart = new Date(booking.slotStart);
    const diffHours = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundAmount = 0;
    let refundPercentage = 0;

    if (booking.paymentStatus === 'PAID') {
      if (isHost || isAdmin) {
        refundPercentage = 100;
        refundAmount = booking.totalAmount;
      } else if (diffHours >= 2) {
        refundPercentage = 100;
        refundAmount = booking.totalAmount;
      } else if (diffHours > 0 && diffHours < 2) {
        refundPercentage = 50;
        refundAmount = Math.round(booking.totalAmount * 0.5);
      } else {
        refundPercentage = 0;
        refundAmount = 0;
      }

      if (refundAmount > 0) {
        await processRefund({
          paymentId: booking.razorpayPaymentId,
          amountInINR: refundAmount,
        });
        booking.paymentStatus = refundPercentage === 100 ? 'REFUNDED' : 'PAID';
      }
    }

    booking.status = 'CANCELLED';
    booking.cancellationReason = reason;
    booking.cancelledAt = now;
    booking.refundAmount = refundAmount;

    // Audit log
    booking.auditLog.push({
      action: 'CANCELLED',
      performedBy: req.user._id,
      role: req.user.role,
      timestamp: now,
      note: `Cancelled by ${req.user.role}. Reason: ${reason}. Refund: ₹${refundAmount} (${refundPercentage}%)`,
    });

    await booking.save();

    // Send notification to the other party
    const recipientId = isOwner ? booking.hostId : booking.userId;
    await Notification.create({
      userId: recipientId,
      title: 'Booking Cancelled',
      message: `Booking ${booking.bookingCode} was cancelled. Reason: ${reason}`,
      type: 'BOOKING_CANCELLED',
      data: { bookingId: booking._id },
    });

    res.status(200).json({
      success: true,
      message: `Booking cancelled successfully. Refund: ₹${refundAmount} (${refundPercentage}%).`,
      booking,
      refund: {
        refundAmount,
        refundPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Host approve / reject booking (especially for emergency or approval requests)
 */
export const hostBookingAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    const booking = await Booking.findById(id).populate('chargerId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.hostId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to manage this booking',
      });
    }

    const isApprove = action === 'CONFIRM' || action === 'APPROVE';

    if (action === 'REJECT') {
      booking.status = 'REJECTED';
      booking.cancellationReason = reason || 'Declined by host';
      booking.cancelledAt = new Date();

      if (booking.paymentStatus === 'PAID') {
        await processRefund({
          paymentId: booking.razorpayPaymentId,
          amountInINR: booking.totalAmount,
        });
        booking.paymentStatus = 'REFUNDED';
        booking.refundAmount = booking.totalAmount;
      }

      booking.auditLog.push({
        action: 'REJECTED',
        performedBy: req.user._id,
        role: 'HOST',
        timestamp: new Date(),
        note: reason || 'Declined by host',
      });

      await Notification.create({
        userId: booking.userId,
        title: 'Booking Request Declined',
        message: `Your booking request was declined by the host. Reason: ${reason || 'Unavailable at requested time'}`,
        type: 'SYSTEM',
        data: { bookingId: booking._id },
      });
    } else if (isApprove) {
      booking.status = 'CONFIRMED';

      booking.auditLog.push({
        action: 'APPROVED',
        performedBy: req.user._id,
        role: 'HOST',
        timestamp: new Date(),
        note: reason || (booking.isEmergency ? 'Emergency SOS accepted by host' : 'Host approved booking'),
      });

      await Notification.create({
        userId: booking.userId,
        title: booking.isEmergency ? '🚨 Emergency Request Accepted!' : 'Booking Approved by Host!',
        message: `Host approved your booking at ${booking.chargerId.title}. You may proceed to charge.`,
        type: 'OWNER_APPROVED',
        isEmergency: booking.isEmergency,
        data: { bookingId: booking._id },
      });
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: `Booking ${action.toLowerCase()}ed successfully`,
      booking,
    });
  } catch (error) {
    next(error);
  }
};
