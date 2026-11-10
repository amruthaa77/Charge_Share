import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { DOCUMENT_LINK_SECRET, ADMIN_JWT_SECRET, JWT_SECRET } from '../config/env.js';
import { protect } from '../middleware/auth.js';
import { Verification } from '../models/Verification.js';
import { AuditLog } from '../models/AuditLog.js';
import { APIError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');

const router = express.Router();

/**
 * Generate a short-lived signed token (valid for 10 minutes) for document preview / inline rendering
 */
const generateSignedUrlHandler = async (req, res, next) => {
  try {
    const rawFilename = req.params.filename || req.body.filename || path.basename(req.body.documentUrl || '');
    if (!rawFilename) {
      throw APIError.badRequest('Filename or documentUrl is required');
    }
    const cleanFilename = path.basename(rawFilename);
    const filePath = path.join(uploadDir, cleanFilename);

    if (!fs.existsSync(filePath)) {
      throw APIError.notFound('Document file not found');
    }

    // Check authorization: Admin or host who owns this document
    if (req.user.role !== 'ADMIN') {
      const isOwner = await Verification.findOne({
        hostId: req.user._id,
        $or: [
          { idProofUrl: { $regex: cleanFilename } },
          { propertyProofUrl: { $regex: cleanFilename } },
          { nocDocumentUrl: { $regex: cleanFilename } },
        ],
      });
      if (!isOwner) {
        throw APIError.forbidden('You do not have permission to access this document');
      }
    }

    const secret = DOCUMENT_LINK_SECRET;
    const signedToken = jwt.sign(
      {
        filename: cleanFilename,
        userId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        purpose: 'document_view',
      },
      secret,
      { expiresIn: '10m' }
    );

    const secureUrl = `/api/v1/documents/${cleanFilename}?token=${signedToken}`;

    res.status(200).json({
      success: true,
      url: secureUrl,
      signedUrl: secureUrl,
      expiresInSeconds: 600,
    });
  } catch (error) {
    next(error);
  }
};

router.get('/signed-url/:filename', protect, generateSignedUrlHandler);
router.post('/sign', protect, generateSignedUrlHandler);

/**
 * Authenticated document viewing and download
 * Accepts Bearer token in header, cookie, or ?token= query param
 */
const documentViewHandler = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const cleanFilename = path.basename(filename);
    const filePath = path.join(uploadDir, cleanFilename);

    if (!fs.existsSync(filePath)) {
      throw APIError.notFound('Document file not found');
    }

    // Resolve user from Authorization header or ?token query param
    let user = null;
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token;

    if (queryToken) {
      try {
        const decoded = jwt.verify(queryToken, DOCUMENT_LINK_SECRET);
        if (decoded.filename !== cleanFilename) {
          throw APIError.forbidden('Invalid document token scope');
        }
        user = { _id: decoded.userId, role: decoded.role, email: decoded.email || 'token@user' };
      } catch {
        throw APIError.unauthenticated('Document access token is invalid or expired');
      }
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        let decoded;
        try {
          decoded = jwt.verify(token, ADMIN_JWT_SECRET);
        } catch {
          decoded = jwt.verify(token, JWT_SECRET);
        }
        const { User } = await import('../models/User.js');
        user = await User.findById(decoded.id);
      } catch {
        throw APIError.unauthenticated('Authentication token is invalid or expired');
      }
    }

    if (!user) {
      throw APIError.unauthenticated('Authentication required to view this document');
    }

    // Authorization check
    let relatedVerification = null;
    if (user.role !== 'ADMIN') {
      relatedVerification = await Verification.findOne({
        hostId: user._id,
        $or: [
          { idProofUrl: { $regex: cleanFilename } },
          { propertyProofUrl: { $regex: cleanFilename } },
          { nocDocumentUrl: { $regex: cleanFilename } },
        ],
      });
      if (!relatedVerification) {
        throw APIError.forbidden('Access denied. You do not own this document.');
      }
    } else {
      relatedVerification = await Verification.findOne({
        $or: [
          { idProofUrl: { $regex: cleanFilename } },
          { propertyProofUrl: { $regex: cleanFilename } },
          { nocDocumentUrl: { $regex: cleanFilename } },
        ],
      });

      // Write Audit Log for admin document view
      await AuditLog.create({
        actorId: user._id,
        actorEmail: user.email || 'admin@chargeshare.in',
        actorRole: 'ADMIN',
        action: 'DOCUMENT_VIEW',
        targetType: 'Verification',
        targetId: relatedVerification ? relatedVerification._id.toString() : cleanFilename,
        targetIdentifier: cleanFilename,
        reason: 'Administrator accessed document for safety verification review',
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        metadata: { filename: cleanFilename },
      });
    }

    // Security Headers: Prevent MIME confusion and force safe rendering
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    const ext = path.extname(cleanFilename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

router.get('/view/:filename', documentViewHandler);
router.get('/:filename', documentViewHandler);

export default router;
