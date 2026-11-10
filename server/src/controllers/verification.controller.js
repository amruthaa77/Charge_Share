import { Verification } from '../models/Verification.js';
import { Charger } from '../models/Charger.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { APIError } from '../utils/errors.js';

export const submitVerification = async (req, res, next) => {
  try {
    const {
      chargerId,
      idProofType,
      idProofUrl,
      propertyProofType,
      propertyProofUrl,
      nocDocumentUrl,
      safetyChecklist,
      propertyConsentDeclared,
    } = req.body;

    const charger = await Charger.findById(chargerId);
    if (!charger) {
      return res.status(404).json({
        success: false,
        message: 'Charger not found',
      });
    }

    if (charger.hostId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit verification for this charger',
      });
    }

    // Upsert verification record
    let verification = await Verification.findOne({ chargerId });

    if (verification) {
      verification.idProofType = idProofType;
      verification.idProofUrl = idProofUrl;
      verification.propertyProofType = propertyProofType;
      verification.propertyProofUrl = propertyProofUrl;
      verification.nocDocumentUrl = nocDocumentUrl || '';
      verification.safetyChecklist = safetyChecklist;
      verification.propertyConsentDeclared = propertyConsentDeclared;
      verification.status = 'PENDING';
      verification.adminFeedback = '';
      await verification.save();
    } else {
      verification = await Verification.create({
        hostId: req.user._id,
        chargerId,
        idProofType,
        idProofUrl,
        propertyProofType,
        propertyProofUrl,
        nocDocumentUrl: nocDocumentUrl || '',
        safetyChecklist,
        propertyConsentDeclared,
        status: 'PENDING',
      });
    }

    charger.status = 'PENDING_VERIFICATION';
    await charger.save();

    res.status(200).json({
      success: true,
      message: 'Verification documents and safety checklist submitted for review.',
      verification,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyVerificationStatus = async (req, res, next) => {
  try {
    const { chargerId } = req.params;

    const verification = await Verification.findOne({ chargerId })
      .populate('chargerId', 'title status city address')
      .populate('reviewedBy', 'name');

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: 'No verification record submitted for this charger yet.',
      });
    }

    if (verification.hostId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this verification',
      });
    }

    res.status(200).json({
      success: true,
      verification,
    });
  } catch (error) {
    next(error);
  }
};

export const adminGetPendingVerifications = async (req, res, next) => {
  try {
    const { status = 'PENDING', area, search, page = 1, limit = 50, sort = 'oldest' } = req.query;
    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    const sortOption = sort === 'newest' ? { createdAt: -1 } : { createdAt: 1 };

    let verifications = await Verification.find(query)
      .populate('hostId', 'name email phone avatar city trustStatus')
      .populate('chargerId', 'title address city state postalCode connectorType powerKW price location status')
      .sort(sortOption);

    // Apply in-memory area or search filter if requested
    if (area && area !== 'ALL') {
      verifications = verifications.filter((v) =>
        (v.chargerId?.address || '').toLowerCase().includes(area.toLowerCase())
      );
    }

    if (search) {
      const q = search.toLowerCase();
      verifications = verifications.filter(
        (v) =>
          (v.hostId?.name || '').toLowerCase().includes(q) ||
          (v.hostId?.email || '').toLowerCase().includes(q) ||
          (v.chargerId?.title || '').toLowerCase().includes(q) ||
          (v.chargerId?.address || '').toLowerCase().includes(q)
      );
    }

    // Counts by status for tabs
    const [pendingCount, approvedCount, rejectedCount, resubCount, allCount] = await Promise.all([
      Verification.countDocuments({ status: 'PENDING' }),
      Verification.countDocuments({ status: 'APPROVED' }),
      Verification.countDocuments({ status: 'REJECTED' }),
      Verification.countDocuments({ status: 'RESUBMISSION_REQUESTED' }),
      Verification.countDocuments({}),
    ]);

    // Mask PII in returned verification list
    const sanitized = verifications.map((v) => {
      const doc = v.toObject();
      if (doc.hostId) {
        const email = doc.hostId.email || '';
        const phone = doc.hostId.phone || '';
        const [userPart, domain] = email.split('@');
        doc.hostId.maskedEmail = userPart
          ? `${userPart[0]}***${userPart.slice(-1)}@${domain || 'chargeshare.in'}`
          : '***@chargeshare.in';
        doc.hostId.maskedPhone = phone.length > 4 ? `+91 ••••• ••${phone.slice(-3)}` : '+91 •••••';
      }
      return doc;
    });

    const paginated = sanitized.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));

    res.status(200).json({
      success: true,
      count: paginated.length,
      total: sanitized.length,
      counts: {
        all: allCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        resubmissionRequested: resubCount,
      },
      verifications: paginated,
    });
  } catch (error) {
    next(error);
  }
};

export const adminReviewVerification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      status, // 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUESTED'
      feedback,
      rejectionReason,
      rejectionPreset,
      resubmissionNotes,
      reviewChecklist,
    } = req.body;

    const verification = await Verification.findById(id).populate('chargerId').populate('hostId');
    if (!verification) {
      throw APIError.notFound('Verification request not found');
    }

    const host = verification.hostId;
    const charger = verification.chargerId;

    if (status === 'APPROVED') {
      verification.status = 'APPROVED';
      verification.adminFeedback = feedback || 'Electrical earthing, NOC, and safety compliance verified.';
      if (reviewChecklist) {
        verification.reviewChecklist = reviewChecklist;
      }
      verification.reviewedBy = req.user._id;
      verification.reviewedAt = new Date();
      await verification.save();

      if (charger) {
        charger.status = 'VERIFIED';
        await charger.save();
      }

      if (host) {
        host.isVerifiedHost = true;
        if (host.emailVerified && host.phoneVerified) {
          host.trustStatus = 'VERIFIED';
        }
        await host.save();

        // Send host notification
        await Notification.create({
          userId: host._id,
          type: 'SYSTEM',
          title: 'Charger Verified & Live!',
          message: `Congratulations! Your 16A charging bay "${charger?.title || 'Listing'}" has passed safety verification and is now live on the Bengaluru network.`,
        });
      }

      // Audit Log
      await AuditLog.create({
        actorId: req.user._id,
        actorEmail: req.user.email,
        actorRole: 'ADMIN',
        action: 'KYC_APPROVE',
        targetType: 'Verification',
        targetId: verification._id.toString(),
        targetIdentifier: charger?.title || 'Charger',
        reason: feedback || 'All checklist items verified compliant.',
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        metadata: {
          chargerId: charger?._id?.toString(),
          hostId: host?._id?.toString(),
          checklist: reviewChecklist,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Verification approved successfully! Charger status updated to VERIFIED.',
        verification,
      });
    }

    if (status === 'REJECTED') {
      const reasonText = (rejectionReason || feedback || '').trim();
      if (reasonText.length < 10) {
        throw APIError.badRequest('Rejection requires a detailed reason of at least 10 characters.');
      }

      verification.status = 'REJECTED';
      verification.adminFeedback = reasonText;
      verification.rejectionReason = reasonText;
      verification.rejectionPreset = rejectionPreset || 'DOCUMENT_INADEQUATE';
      verification.reviewedBy = req.user._id;
      verification.reviewedAt = new Date();
      await verification.save();

      if (charger) {
        charger.status = 'REJECTED';
        await charger.save();
      }

      if (host) {
        // Send host notification
        await Notification.create({
          userId: host._id,
          type: 'SYSTEM',
          title: 'Bay Verification Needs Revision',
          message: `Your listing "${charger?.title || 'Listing'}" verification was not approved. Reason: ${reasonText}`,
        });
      }

      // Audit Log
      await AuditLog.create({
        actorId: req.user._id,
        actorEmail: req.user.email,
        actorRole: 'ADMIN',
        action: 'KYC_REJECT',
        targetType: 'Verification',
        targetId: verification._id.toString(),
        targetIdentifier: charger?.title || 'Charger',
        reason: reasonText,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        metadata: {
          chargerId: charger?._id?.toString(),
          hostId: host?._id?.toString(),
          preset: rejectionPreset,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Verification rejected. Reason documented and host notified.',
        verification,
      });
    }

    if (status === 'RESUBMISSION_REQUESTED') {
      const notes = (resubmissionNotes || feedback || '').trim();
      if (notes.length < 10) {
        throw APIError.badRequest('Resubmission request requires instructions of at least 10 characters.');
      }

      verification.status = 'RESUBMISSION_REQUESTED';
      verification.resubmissionNotes = notes;
      verification.adminFeedback = notes;
      verification.reviewedBy = req.user._id;
      verification.reviewedAt = new Date();
      await verification.save();

      if (charger) {
        charger.status = 'PENDING_VERIFICATION';
        await charger.save();
      }

      if (host) {
        await Notification.create({
          userId: host._id,
          type: 'SYSTEM',
          title: 'Action Required: Update Verification Documents',
          message: `Our safety inspection team requested additional details for "${charger?.title || 'Listing'}": ${notes}`,
        });
      }

      // Audit Log
      await AuditLog.create({
        actorId: req.user._id,
        actorEmail: req.user.email,
        actorRole: 'ADMIN',
        action: 'KYC_REQUEST_INFO',
        targetType: 'Verification',
        targetId: verification._id.toString(),
        targetIdentifier: charger?.title || 'Charger',
        reason: notes,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        metadata: {
          chargerId: charger?._id?.toString(),
          hostId: host?._id?.toString(),
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Resubmission requested. Host has been notified.',
        verification,
      });
    }

    throw APIError.badRequest('Invalid verification review action');
  } catch (error) {
    next(error);
  }
};
