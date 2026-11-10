import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema(
  {
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
    idProofType: {
      type: String,
      enum: ['AADHAAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT'],
      default: 'AADHAAR',
    },
    idProofUrl: {
      type: String,
      required: [true, 'Host ID proof document is required'],
    },
    propertyProofType: {
      type: String,
      enum: ['ELECTRICITY_BILL', 'PROPERTY_TAX', 'SALE_DEED', 'RENTAL_AGREEMENT_NOC', 'SOCIETY_NOC'],
      default: 'ELECTRICITY_BILL',
    },
    propertyProofUrl: {
      type: String,
      required: [true, 'Property proof / NOC document is required'],
    },
    nocDocumentUrl: {
      type: String,
      default: '',
    },
    safetyChecklist: {
      earthingVerified: { type: Boolean, default: false },
      mcbRccbInstalled: { type: Boolean, default: false },
      weatherproofProtection: { type: Boolean, default: false },
      cctvSurveillance: { type: Boolean, default: false },
      fireExtinguisherNearby: { type: Boolean, default: false },
    },
    propertyConsentDeclared: {
      type: Boolean,
      required: [true, 'You must declare that you have full legal rights or owner/society NOC to host this charger'],
      default: false,
    },
    status: {
      type: String,
      enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUESTED'],
      default: 'PENDING',
      index: true,
    },
    adminFeedback: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    rejectionPreset: {
      type: String,
      default: '',
    },
    resubmissionNotes: {
      type: String,
      default: '',
    },
    reviewChecklist: {
      documentsLegible: { type: Boolean, default: false },
      nameMatches: { type: Boolean, default: false },
      addressMatchesBay: { type: Boolean, default: false },
      nocPresentForApartments: { type: Boolean, default: false },
      earthingDeclared: { type: Boolean, default: false },
    },
    idNumberMasked: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Verification = mongoose.model('Verification', verificationSchema);
