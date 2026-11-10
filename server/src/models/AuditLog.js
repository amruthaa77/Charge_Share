import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    actorEmail: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      enum: ['ADMIN', 'SYSTEM', 'GUEST', 'UNKNOWN'],
      default: 'ADMIN',
    },
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        'KYC_APPROVE',
        'KYC_REJECT',
        'KYC_REQUEST_INFO',
        'DOCUMENT_VIEW',
        'DOCUMENT_DOWNLOAD',
        'USER_TRUST_CHANGE',
        'USER_SUSPEND',
        'USER_REACTIVATE',
        'USER_FLAG',
        'USER_NOTE_ADD',
        'USER_VERIFY_RESEND',
        'LISTING_SUSPEND',
        'LISTING_RELIST',
        'REPORT_RESOLVE',
        'CONTACT_STATUS_CHANGE',
        'DATA_EXPORT',
        'ADMIN_CREATE',
        'ADMIN_PASSWORD_RESET',
        'ADMIN_LOGIN_SUCCESS',
        'ADMIN_LOGIN_FAILED',
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ['User', 'Verification', 'Charger', 'Booking', 'Report', 'Contact', 'System', 'Auth'],
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    targetIdentifier: {
      type: String,
      default: '', // User email, Charger title, Booking code, etc.
    },
    reason: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
