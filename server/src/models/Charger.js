import mongoose from 'mongoose';

const chargerSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide charger listing title'],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: [true, 'Please provide description of the charger location and setup'],
      trim: true,
      maxlength: 1000,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, 'PIN code is required'],
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    connectorType: {
      type: String,
      enum: ['CCS2', 'Type 2', 'Bharat AC-001', '3-pin', 'CHAdeMO'],
      required: [true, 'Please select charger connector type'],
      index: true,
    },
    powerKW: {
      type: Number,
      required: [true, 'Power in kW is required (e.g., 3.3, 7.4, 22, 50)'],
      min: 1,
      max: 350,
    },
    pricingType: {
      type: String,
      enum: ['PER_KWH', 'PER_HOUR'],
      default: 'PER_KWH',
    },
    price: {
      type: Number,
      required: [true, 'Price in INR is required'],
      min: 1,
    },
    photos: {
      type: [String],
      default: [],
    },
    houseRules: {
      type: [String],
      default: [
        'Park within designated yellow lines',
        'Turn off AC while fast charging',
        'Disconnect charger promptly when booking ends',
      ],
    },
    safetyFeatures: {
      type: [String],
      default: ['Earthing verified', 'MCB/RCCB installed', 'Weatherproof cover'],
    },
    status: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'PAUSED', 'SUSPENDED'],
      default: 'PENDING_VERIFICATION',
      index: true,
    },
    adminSuspendReason: {
      type: String,
      default: '',
    },
    adminSuspendedAt: {
      type: Date,
    },
    adminSuspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    liveStatus: {
      type: String,
      enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OFFLINE', 'MAINTENANCE'],
      default: 'AVAILABLE',
      index: true,
    },
    availabilityMode: {
      type: String,
      enum: ['INSTANT_BOOKING', 'REQUEST_APPROVAL', 'SCHEDULED_ONLY', 'EMERGENCY_ONLY'],
      default: 'INSTANT_BOOKING',
    },
    instantBooking: {
      type: Boolean,
      default: true,
    },
    emergencySupport: {
      type: Boolean,
      default: true,
      index: true,
    },
    allowsReservations: {
      type: Boolean,
      default: true,
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    responseTimeMinutes: {
      type: Number,
      default: 5,
    },
    idleFeePerMinute: {
      type: Number,
      default: 2,
    },
    contactPhone: {
      type: String,
      default: '',
    },
    weeklySchedule: [
      {
        day: { type: Number, min: 0, max: 6 }, // 0 = Sunday, 1 = Monday, etc.
        open: { type: String, default: '06:00' }, // HH:mm
        close: { type: String, default: '22:00' },
        isActive: { type: Boolean, default: true },
      },
    ],
    blockedDates: {
      type: [String], // YYYY-MM-DD
      default: [],
    },
    ratingAvg: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geospatial searches ($geoNear, $nearSphere)
chargerSchema.index({ location: '2dsphere' });
chargerSchema.index({ status: 1, connectorType: 1, powerKW: 1, price: 1 });
chargerSchema.index({ status: 1, emergencySupport: 1, liveStatus: 1 });

export const Charger = mongoose.model('Charger', chargerSchema);
