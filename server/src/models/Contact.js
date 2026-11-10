import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: [true, 'Please select an inquiry topic'],
      enum: [
        'GENERAL_INQUIRY',
        'HOSTING_SUPPORT',
        'BOOKING_ISSUE',
        'SAFETY_CONCERN',
        'PARTNERSHIP',
        'GRIEVANCE',
      ],
      default: 'GENERAL_INQUIRY',
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: 2000,
    },
    consentGiven: {
      type: Boolean,
      required: [true, 'Affirmative consent is required'],
      default: false,
    },
    status: {
      type: String,
      enum: ['NEW', 'IN_REVIEW', 'RESOLVED'],
      default: 'NEW',
      index: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Contact = mongoose.model('Contact', contactSchema);
