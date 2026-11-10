import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'BOOKING_CONFIRMED',
        'OWNER_APPROVED',
        'EMERGENCY_REQUEST',
        'BOOKING_CANCELLED',
        'CHARGER_AVAILABLE',
        'SYSTEM',
      ],
      default: 'SYSTEM',
      index: true,
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    data: {
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
      chargerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger' },
      metadata: { type: Object, default: {} },
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
