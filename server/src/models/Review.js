import mongoose from 'mongoose';
import { Charger } from './Charger.js';

const reviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // Only 1 review per booking
    },
    chargerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charger',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Please provide review comments'],
      trim: true,
      minlength: 5,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Static method to update average rating on Charger
reviewSchema.statics.calculateAverageRating = async function (chargerId) {
  const stats = await this.aggregate([
    { $match: { chargerId: new mongoose.Types.ObjectId(chargerId) } },
    {
      $group: {
        _id: '$chargerId',
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Charger.findByIdAndUpdate(chargerId, {
      ratingAvg: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].reviewCount,
    });
  } else {
    await Charger.findByIdAndUpdate(chargerId, {
      ratingAvg: 5.0,
      reviewCount: 0,
    });
  }
};

reviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.chargerId);
});

export const Review = mongoose.model('Review', reviewSchema);
