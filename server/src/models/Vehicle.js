import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    make: {
      type: String,
      required: [true, 'Please specify vehicle make'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Please specify vehicle model'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Please specify manufacturing year'],
      min: 2010,
      max: new Date().getFullYear() + 1,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Please provide vehicle registration number (e.g. KA-01-EQ-1234)'],
      trim: true,
      uppercase: true,
    },
    connectorType: {
      type: String,
      enum: ['CCS2', 'Type 2', 'Bharat AC-001', '3-pin', 'CHAdeMO'],
      required: [true, 'Please select supported connector type'],
    },
    batteryCapacityKWh: {
      type: Number,
      default: 30,
      min: 1,
      max: 200,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
