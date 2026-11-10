/**
 * Cleanup script for orphaned, incomplete, or corrupt user records.
 * 
 * Usage:
 *   node scripts/cleanup_orphaned_users.js [--dry-run]
 * 
 * In dry-run mode (default if flag passed), it only reports candidate records.
 * Without --dry-run, it safely deletes identified corrupted or orphaned user records.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ev_charger';

const runCleanup = async () => {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`Connecting to database: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
  await mongoose.connect(MONGODB_URI);

  const User = mongoose.model(
    'User',
    new mongoose.Schema({}, { strict: false, timestamps: true }),
    'users'
  );

  console.log('Scanning for orphaned or corrupt user records...');

  // Identify corrupt or incomplete accounts:
  // 1. Missing essential fields: email, phone, or name
  // 2. Corrupted emails or phone numbers
  const corruptQuery = {
    $or: [
      { email: { $exists: false } },
      { email: null },
      { email: '' },
      { email: { $not: /^\S+@\S+\.\S+$/ } },
      { phone: { $exists: false } },
      { phone: null },
      { phone: '' },
      { name: { $exists: false } },
      { name: null },
      { name: '' },
    ],
  };

  const corruptUsers = await User.find(corruptQuery);
  console.log(`Found ${corruptUsers.length} corrupt/incomplete user records.`);

  for (const u of corruptUsers) {
    console.log(`- Corrupt User ID: ${u._id}, Email: ${u.email || 'MISSING'}, Phone: ${u.phone || 'MISSING'}, Name: ${u.name || 'MISSING'}`);
  }

  if (isDryRun) {
    console.log('\n[Dry Run] No records were deleted. Run without --dry-run to delete.');
  } else if (corruptUsers.length > 0) {
    const result = await User.deleteMany(corruptQuery);
    console.log(`\nSuccessfully removed ${result.deletedCount} corrupted user record(s).`);
  } else {
    console.log('\nDatabase is clean. Zero corrupt records found.');
  }

  await mongoose.disconnect();
  console.log('Cleanup script completed.');
};

runCleanup().catch((err) => {
  console.error('Cleanup failed with error:', err);
  process.exit(1);
});
