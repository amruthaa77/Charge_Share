import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import crypto from 'crypto';

import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import vehicleRoutes from './routes/vehicle.routes.js';
import chargerRoutes from './routes/charger.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import reviewRoutes from './routes/review.routes.js';
import verificationRoutes from './routes/verification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import reportRoutes from './routes/report.routes.js';
import contactRoutes from './routes/contact.routes.js';
import documentRoutes from './routes/document.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Request ID tracking
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Security middleware with Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://checkout.razorpay.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://unpkg.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.tile.openstreetmap.org',
          'https://*.basemaps.cartocdn.com',
          'https://images.unsplash.com',
          'https://api.qrserver.com',
        ],
        connectSrc: [
          "'self'",
          'https://*.tile.openstreetmap.org',
          'https://nominatim.openstreetmap.org',
          'https://api.razorpay.com',
          'http://localhost:*',
          'http://127.0.0.1:*',
        ],
        frameSrc: ['https://api.razorpay.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/portfolio mode
    },
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiters
const isTesting = process.env.NODE_ENV === 'test';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 5000,
  skip: () => isTesting,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil(((req.rateLimit?.resetTime?.getTime() || Date.now() + 15 * 60 * 1000) - Date.now()) / 1000) || 900;
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
      retryAfter,
      requestId: req.id,
    });
  },
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: () => isTesting,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil(((req.rateLimit?.resetTime?.getTime() || Date.now() + 15 * 60 * 1000) - Date.now()) / 1000) || 900;
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many inquiry submissions from this IP. Please try again after 15 minutes.',
      retryAfter,
      requestId: req.id,
    });
  },
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: () => isTesting,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil(((req.rateLimit?.resetTime?.getTime() || Date.now() + 15 * 60 * 1000) - Date.now()) / 1000) || 900;
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many reports submitted from this IP. Please try again after 15 minutes.',
      retryAfter,
      requestId: req.id,
    });
  },
});

app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/contact', contactLimiter);
app.use('/api/v1/reports', reportLimiter);

// Protected document access (authenticated, audited, access-controlled)
app.use('/api/v1/documents', documentRoutes);
app.use('/uploads', (req, res, next) => {
  req.url = `/view${req.url}`;
  documentRoutes(req, res, next);
});

// Swagger Documentation
const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, './docs/openapi.json'), 'utf8')
);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'ChargeShare India API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes (versioned under /api/v1 with /api aliases for client flexibility)
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/chargers', chargerRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/verifications', verificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/contact', contactRoutes);

// 404 Route handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Resource not found at ${req.originalUrl}`,
    requestId: req.id,
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
