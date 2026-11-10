import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    chargerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charger',
      required: [true, 'Charger ID is required'],
      index: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter ID is required'],
      index: true,
    },
    reason: {
      type: String,
      enum: [
        'INACCURATE_LOCATION',
        'BROKEN_HARDWARE',
        'HOST_UNRESPONSIVE',
        'SAFETY_HAZARD',
        'OVERCHARGING',
        'OTHER',
      ],
      required: [true, 'Please specify a report reason'],
    },
    description: {
      type: String,
      required: [true, 'Please provide details for this report'],
      maxlength: 1000,
      trim: true,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'],
      default: 'PENDING',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Report = mongoose.model('Report', reportSchema);
