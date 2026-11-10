import dotenv from 'dotenv';
dotenv.config();
import './config/env.js';

import app from './app.js';
import { connectDB } from './config/db.js';
import { startBookingCleanupJob } from './services/bookingCleanUp.service.js';
import { User } from './models/User.js';
import { Charger } from './models/Charger.js';
import { AuditLog } from './models/AuditLog.js';
import { releasePort } from './scripts/clean-ports.js';

const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';
const isDemoMode = process.env.DEMO_MODE === 'true' || (!isProd && process.env.DEMO_MODE !== 'false');

// Connect to MongoDB
connectDB()
  .then(async () => {
    // 1. Security warning check for production
    if (isProd && process.env.DEMO_MODE === 'true') {
      console.warn('⚠️ [SECURITY WARNING] DEMO_MODE is ENABLED in PRODUCTION environment. Demo credentials and shortcuts are active!');
    }

    // 2. Admin bootstrap check (ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD)
    if (process.env.ADMIN_BOOTSTRAP_EMAIL && process.env.ADMIN_BOOTSTRAP_PASSWORD) {
      try {
        const adminExists = await User.exists({ role: 'ADMIN' });
        if (!adminExists) {
          console.log(`[Bootstrap] Creating initial administrator (${process.env.ADMIN_BOOTSTRAP_EMAIL})...`);
          const admin = await User.create({
            name: 'System Administrator (Bootstrapped)',
            email: process.env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase().trim(),
            password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
            phone: '+919999900000',
            role: 'ADMIN',
            city: 'Bengaluru',
            mustChangePassword: true,
            trustStatus: 'VERIFIED',
            emailVerified: true,
            phoneVerified: true,
          });

          await AuditLog.create({
            actorId: admin._id,
            actorEmail: admin.email,
            actorRole: 'ADMIN',
            action: 'ADMIN_CREATE',
            targetType: 'User',
            targetId: admin._id.toString(),
            targetIdentifier: admin.email,
            reason: 'Administrator created via initial environment bootstrap',
            metadata: { method: 'BOOTSTRAP' },
          });
          console.log('[Bootstrap] Administrator created successfully.');
        } else {
          console.log('[Bootstrap] Administrator already exists. Skipping bootstrap.');
        }
      } catch (bootstrapErr) {
        console.error('[Bootstrap] Failed to bootstrap administrator:', bootstrapErr.message);
      }
    }

    // 3. Demo seed check
    try {
      const chargerCount = await Charger.countDocuments();
      if (chargerCount === 0) {
        if (isDemoMode) {
          process.env.DEMO_MODE = 'true';
          console.log('[Server] Chargers empty and DEMO_MODE is active. Auto-seeding initial demo chargers and data...');
          const { seedDatabase } = await import('./scripts/seed.js');
          await seedDatabase(false);
        } else {
          console.log('[Server] Database has no chargers. Production mode active (DEMO_MODE=false). Skipping demo seed.');
        }
      }
    } catch (seedCheckErr) {
      console.warn('[Server] Seed check notice:', seedCheckErr.message);
    }

    // Start background cron jobs (e.g. slot hold cleanup)
    startBookingCleanupJob();

    // In development, ensure port is released if an orphaned instance was left behind
    if (!isProd) {
      releasePort(PORT);
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`⚡ ChargeShare India Server running on port ${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📚 Swagger Docs: http://localhost:${PORT}/api/docs`);
      console.log(`===============================================`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n==============================================================`);
        console.error(`❌ [Server Error] Port ${PORT} is already in use by another process.`);
        console.error(`💡 To resolve this:`);
        console.error(`   1. Run 'npm run clean:ports' to terminate any stuck background processes.`);
        console.error(`   2. Or close any other terminal tabs running ChargeShare India.`);
        console.error(`==============================================================\n`);
        process.exit(1);
      } else {
        console.error('[Server Error]', err);
        process.exit(1);
      }
    });

    const shutdown = () => {
      console.log('\n[Server] Graceful shutdown initiated...');
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
  });
