import { Booking } from '../models/Booking.js';
import { createRazorpayOrder, verifyPaymentSignature } from '../services/payment.service.js';
import QRCode from 'qrcode';

export const createPaymentOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this payment',
      });
    }

    const orderData = await createRazorpayOrder({
      amountInINR: booking.totalAmount,
      receipt: booking.bookingCode,
      notes: {
        bookingId: booking._id.toString(),
      },
    });

    booking.razorpayOrderId = orderData.orderId;
    await booking.save();

    res.status(200).json({
      success: true,
      order: orderData,
      booking: {
        id: booking._id,
        bookingCode: booking.bookingCode,
        amount: booking.totalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, isMock } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isValid = verifyPaymentSignature({
      razorpayOrderId: razorpayOrderId || booking.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      isMock,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    const qrData = JSON.stringify({
      code: booking.bookingCode,
      bookingId: booking._id,
      chargerId: booking.chargerId,
      slotStart: booking.slotStart,
      verified: true,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);

    booking.status = 'CONFIRMED';
    booking.paymentStatus = 'PAID';
    booking.razorpayOrderId = razorpayOrderId || booking.razorpayOrderId;
    booking.razorpayPaymentId = razorpayPaymentId || `pay_mock_${Date.now()}`;
    booking.razorpaySignature = razorpaySignature || 'signature_mock';
    booking.qrCodeDataUrl = qrCodeDataUrl;

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified and booking confirmed successfully',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

export const simulateMockPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.userId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const mockPaymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const qrData = JSON.stringify({
      code: booking.bookingCode,
      bookingId: booking._id,
      chargerId: booking.chargerId,
      slotStart: booking.slotStart,
      verified: true,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);

    booking.status = 'CONFIRMED';
    booking.paymentStatus = 'PAID';
    booking.razorpayPaymentId = mockPaymentId;
    booking.razorpaySignature = 'mock_signature_approved';
    booking.qrCodeDataUrl = qrCodeDataUrl;

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Demo Mock Payment completed successfully!',
      booking,
    });
  } catch (error) {
    next(error);
  }
};
