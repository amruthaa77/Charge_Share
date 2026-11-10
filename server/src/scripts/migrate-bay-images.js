import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Charger } from '../models/Charger.js';
import { BAY_IMAGES } from '../constants/bayImages.js';
import { connectDB } from '../config/db.js';

export async function migrateBayImages() {
  console.log('====================================================');
  console.log('🔄 ChargeShare India - Bay Image Migration Utility');
  console.log('====================================================\n');

  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  // Retrieve all chargers sorted strictly by creation time and ID (deterministic order)
  const chargers = await Charger.find({}).sort({ createdAt: 1, _id: 1 });
  console.log(`Found ${chargers.length} charging bay(s) in database.\n`);

  if (chargers.length === 0) {
    console.log('No chargers found to migrate.');
    return { total: 0, updated: 0, distribution: {} };
  }

  const distribution = {};
  BAY_IMAGES.forEach((img) => {
    distribution[img] = 0;
  });

  let updatedCount = 0;

  for (let i = 0; i < chargers.length; i++) {
    const charger = chargers[i];
    // Deterministic round-robin assignment so neighboring bays alternate images
    const assignedImage = BAY_IMAGES[i % BAY_IMAGES.length];

    charger.photos = [assignedImage];
    await charger.save();

    distribution[assignedImage] = (distribution[assignedImage] || 0) + 1;
    updatedCount++;

    console.log(
      `[${String(i + 1).padStart(2, '0')}/${chargers.length}] ${charger.title.padEnd(52)} -> ${assignedImage}`
    );
  }

  console.log('\n----------------------------------------------------');
  console.log('📊 Migration Summary & Distribution:');
  console.log('----------------------------------------------------');
  console.log(`Total Chargers Inspected : ${chargers.length}`);
  console.log(`Total Chargers Assigned  : ${updatedCount}`);
  console.log('\nPer-Image Distribution (Round-Robin):');
  Object.entries(distribution).forEach(([img, count]) => {
    console.log(`  • ${img.padEnd(28)} : ${count} bay(s)`);
  });

  console.log('\n✅ Zero car images or external Unsplash links remaining in charger records.');
  console.log('====================================================\n');

  return {
    total: chargers.length,
    updated: updatedCount,
    distribution,
  };
}

// Allow direct CLI execution
if (process.argv[1] && process.argv[1].includes('migrate-bay-images')) {
  migrateBayImages()
    .then(() => {
      mongoose.disconnect().then(() => process.exit(0));
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
