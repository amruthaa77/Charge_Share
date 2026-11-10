import cron from 'node-cron';
import { Booking } from '../models/Booking.js';

export const releaseExpiredHolds = async () => {
  try {
    const now = new Date();
    const result = await Booking.updateMany(
      {
        status: 'PENDING_PAYMENT',
        heldUntil: { $lt: now },
      },
      {
        $set: {
          status: 'CANCELLED',
          cancellationReason: 'Payment hold expired after 10 minutes',
          cancelledAt: now,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[Slot Hold Cleanup] Released ${result.modifiedCount} expired booking hold(s).`);
    }
    return result.modifiedCount;
  } catch (error) {
    console.error(`[Slot Hold Cleanup Error]: ${error.message}`);
    return 0;
  }
};

export const startBookingCleanupJob = () => {
  // Check every minute for expired slot holds
  cron.schedule('* * * * *', async () => {
    await releaseExpiredHolds();
  });
  console.log('[Scheduler] Booking hold cleanup job scheduled (every 1 min).');
};
