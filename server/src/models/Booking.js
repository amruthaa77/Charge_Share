import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    chargerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charger',
      required: true,
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    bookingType: {
      type: String,
      enum: ['INSTANT', 'RESERVATION', 'EMERGENCY'],
      default: 'INSTANT',
      index: true,
    },
    isEmergency: {
      type: Boolean,
      default: false,
      index: true,
    },
    emergencyDetails: {
      batteryPercent: { type: Number, min: 0, max: 100 },
      vehicleModel: { type: String, default: '' },
      connectorType: { type: String, default: '' },
      userLocation: {
        coordinates: { type: [Number] }, // [lng, lat]
        address: { type: String, default: '' },
      },
      emergencyNote: { type: String, default: '' },
    },
    slotStart: {
      type: Date,
      required: true,
      index: true,
    },
    slotEnd: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
    },
    unitsBooked: {
      type: Number,
      default: 1,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    hostEarnings: {
      type: Number,
      required: true,
      min: 0,
    },
    idleFeePerMinute: {
      type: Number,
      default: 2,
    },
    status: {
      type: String,
      enum: [
        'PENDING_APPROVAL',
        'PENDING_PAYMENT',
        'CONFIRMED',
        'ACTIVE',
        'COMPLETED',
        'CANCELLED',
        'REJECTED',
        'EXPIRED',
      ],
      default: 'PENDING_PAYMENT',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'REFUNDED', 'FAILED'],
      default: 'PENDING',
    },
    razorpayOrderId: {
      type: String,
      default: '',
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    razorpaySignature: {
      type: String,
      default: '',
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    cancelledAt: {
      type: Date,
    },
    heldUntil: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes hold
    },
    qrCodeDataUrl: {
      type: String,
      default: '',
    },
    hasReview: {
      type: Boolean,
      default: false,
    },
    auditLog: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

/**
 * CRITICAL ENGINEERING REQUIREMENT:
 * Unique partial index preventing double-booking race conditions at DB level.
 * Guarantees that no two concurrent active requests can book the identical (chargerId, slotStart).
 */
bookingSchema.index(
  { chargerId: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['PENDING_PAYMENT', 'CONFIRMED', 'PENDING_APPROVAL', 'ACTIVE'] },
    },
  }
);

bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ hostId: 1, status: 1 });
bookingSchema.index({ hostId: 1, isEmergency: 1, status: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
