import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      required: [true, 'Please provide an Indian mobile phone number'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['EV_OWNER', 'HOST', 'ADMIN'],
      default: 'EV_OWNER',
    },
    avatar: {
      type: String,
      default: '',
    },
    isVerifiedHost: {
      type: Boolean,
      default: false,
    },
    city: {
      type: String,
      default: 'Bengaluru',
      trim: true,
    },
    isOnline: {
      type: Boolean,
      default: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    expectedResponseTime: {
      type: String,
      default: '< 5 mins',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    trustStatus: {
      type: String,
      enum: ['UNVERIFIED', 'VERIFIED', 'UNDER_REVIEW', 'FLAGGED', 'SUSPENDED'],
      default: 'UNVERIFIED',
      index: true,
    },
    trustReason: {
      type: String,
      default: '',
    },
    trustUpdatedAt: {
      type: Date,
    },
    trustUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    adminNotes: [
      {
        text: { type: String, required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        authorName: { type: String, default: 'Admin' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    must_change_password: {
      type: Boolean,
      default: false,
    },
    lastLoginIp: {
      type: String,
      default: '',
    },
    lastLoginUserAgent: {
      type: String,
      default: '',
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is temporarily locked
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Safe JSON serialization
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model('User', userSchema);
