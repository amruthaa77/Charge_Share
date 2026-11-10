import { Review } from '../models/Review.js';
import { Booking } from '../models/Booking.js';
import { Charger } from '../models/Charger.js';

export const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const userId = req.user._id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking not found',
        requestId: req.id,
      });
    }

    // Security check: User must be the one who completed the booking
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You can only review bookings made by your account.',
        requestId: req.id,
      });
    }

    // Check completion status
    const isCompleted =
      booking.status === 'COMPLETED' ||
      (booking.status === 'CONFIRMED' && new Date(booking.slotEnd).getTime() <= Date.now());

    if (!isCompleted) {
      return res.status(400).json({
        success: false,
        code: 'SESSION_NOT_COMPLETED',
        message: 'You can only leave a review after the charging session has completed.',
        requestId: req.id,
      });
    }

    // Check if already reviewed
    const existing = await Review.findOne({ bookingId });
    if (existing) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_REVIEWED',
        message: 'You have already submitted a review for this booking.',
        requestId: req.id,
      });
    }

    const review = await Review.create({
      bookingId,
      chargerId: booking.chargerId,
      userId,
      rating,
      comment,
    });

    booking.hasReview = true;
    if (booking.status !== 'COMPLETED') {
      booking.status = 'COMPLETED';
    }
    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. Thank you for your feedback!',
      review,
    });
  } catch (error) {
    next(error);
  }
};

export const getChargerReviews = async (req, res, next) => {
  try {
    const { chargerId } = req.params;

    const reviews = await Review.find({ chargerId })
      .populate('userId', 'name avatar city')
      .sort({ createdAt: -1 });

    const charger = await Charger.findById(chargerId).select('ratingAvg reviewCount');

    res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating: charger ? charger.ratingAvg : 5.0,
      totalReviews: charger ? charger.reviewCount : reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};
