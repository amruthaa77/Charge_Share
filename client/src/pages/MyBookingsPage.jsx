import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI, reviewAPI } from '../services/api';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { DataErrorState } from '../components/common/DataErrorState';
import { getErrorMessage } from '../utils/errorMapper';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  XCircle,
  Star,
  CheckCircle2,
  Navigation,
  Bike,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab] = useState('UPCOMING'); // UPCOMING, COMPLETED, CANCELLED

  // Modals
  const [selectedBookingQR, setSelectedBookingQR] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [reviewModalBooking, setReviewModalBooking] = useState(null);

  // Review state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');
  const [reviewError, setReviewError] = useState(null);

  // Cancel state
  const [cancelReason, setCancelReason] = useState('Schedule changed');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await bookingAPI.getMyBookings({ status: activeTab, type: 'user' });
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error('Failed to fetch bookings', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  // Refund estimation
  const getRefundEstimate = (booking) => {
    if (!booking) return { percent: 0, amount: 0, diffHours: 0 };
    const now = new Date();
    const slotStart = new Date(booking.slotStart);
    const diffHours = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours >= 2) {
      return { percent: 100, amount: booking.totalAmount, diffHours };
    } else if (diffHours > 0) {
      return { percent: 50, amount: Math.round(booking.totalAmount * 0.5), diffHours };
    } else {
      return { percent: 0, amount: 0, diffHours };
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await bookingAPI.cancel(cancelModalBooking._id, { reason: cancelReason });
      setCancelModalBooking(null);
      fetchBookings();
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewModalBooking) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await reviewAPI.create({
        bookingId: reviewModalBooking._id,
        rating,
        comment: reviewComment,
      });
      setReviewSuccessMsg('Review submitted! Thank you for supporting the EV two-wheeler community.');
      setTimeout(() => {
        setReviewModalBooking(null);
        setReviewSuccessMsg('');
        setReviewComment('');
        fetchBookings();
      }, 1500);
    } catch (err) {
      setReviewError(getErrorMessage(err));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const getDirectionsUrl = (booking) => {
    const charger = booking.chargerId;
    if (charger?.location?.coordinates) {
      const [lng, lat] = charger.location.coordinates;
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${charger?.address || ''}, Bengaluru`
    )}`;
  };

  const tabs = [
    { key: 'UPCOMING', label: 'Active & Upcoming' },
    { key: 'COMPLETED', label: 'Completed Sessions' },
    { key: 'CANCELLED', label: 'Cancelled & Refunded' },
  ];

  return (
    <div className="min-h-[100dvh] pb-24 bg-bg text-text-primary transition-colors">
      {/* Unified Page Header */}
      <PageHeader
        badge={
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand border border-brand/20 text-xs font-semibold">
            <Bike className="w-3.5 h-3.5" />
            <span>Two-Wheeler Charging Grid</span>
          </div>
        }
        title="My Digital Charging Passes"
        description="Access digital QR gate passes, live session timers, and automated cancellation refunds."
        action={
          <Link
            to="/explore"
            className="px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand text-brand-contrast font-semibold text-xs hover:opacity-90 transition-all shadow-luxury-sm flex items-center gap-1.5 cursor-pointer touch-target-min"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Book Another Bay</span>
          </Link>
        }
      >
        {/* Tab Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const isTabActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-4 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-brand text-brand-contrast shadow-luxury-sm font-bold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-3xl bg-surface border border-border animate-pulse p-6 space-y-4 shadow-luxury-sm">
                <div className="h-4 w-24 bg-bg-elevated rounded-full" />
                <div className="h-6 w-3/4 bg-bg-elevated rounded-full" />
                <div className="h-12 w-full bg-bg-elevated rounded-2xl" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Couldn't load your passes"
            onRetry={fetchBookings}
          />
        ) : bookings.length === 0 ? (
          <EmptyState
            title={`No ${activeTab.toLowerCase()} sessions found`}
            description={
              activeTab === 'UPCOMING'
                ? 'You do not have any active upcoming charging reservations. Explore verified 16A sockets on the map to book a bay.'
                : `You do not have any ${activeTab.toLowerCase()} charging records.`
            }
            actionLabel="Discover 16A Bays"
            onAction={() => (window.location.href = '/explore')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking) => {
              const charger = booking.chargerId;
              const slotDate = new Date(booking.slotStart);
              const formattedDate = slotDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const formattedTime = `${slotDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })} - ${new Date(booking.slotEnd).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}`;

              return (
                <div
                  key={booking._id}
                  className="rounded-3xl bg-surface border border-border overflow-hidden hover:border-brand/40 transition-all flex flex-col justify-between shadow-luxury-sm hover:shadow-luxury"
                >
                  <div>
                    {/* Top ticket strip */}
                    <div className="p-4 bg-bg-elevated border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 text-[10px] font-bold">
                          {booking.status}
                        </span>
                        {booking.isEmergency && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[10px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>SOS Pass</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-text-muted">
                        #{booking.bookingCode}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="font-editorial text-lg font-bold text-text-primary leading-snug">
                          {charger?.title || 'Bengaluru 16A Socket'}
                        </h3>
                        <p className="text-xs text-text-secondary flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                          <span className="line-clamp-1">{charger?.address}, Bengaluru</span>
                        </p>
                      </div>

                      {/* Time & Vehicle */}
                      <div className="p-3.5 rounded-2xl bg-bg-elevated/70 border border-border/60 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-brand" />
                            <span>{formattedDate}</span>
                          </span>
                          <span className="font-bold text-text-primary">{formattedTime}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                            <Bike className="w-3.5 h-3.5 text-brand" />
                            <span>Vehicle</span>
                          </span>
                          <span className="font-bold text-text-primary">
                            {booking.vehicleId ? `${booking.vehicleId.make} ${booking.vehicleId.model}` : 'EV Scooter'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-text-secondary">Total Paid</span>
                        <span className="font-editorial text-lg font-bold text-text-primary">
                          ₹{booking.totalAmount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 bg-bg-elevated border-t border-border flex items-center justify-between gap-2">
                    {booking.status === 'CONFIRMED' || booking.status === 'HELD' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedBookingQR(booking)}
                          className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-brand hover:opacity-90 text-brand-contrast font-bold text-xs flex items-center justify-center gap-1.5 shadow-luxury-sm cursor-pointer touch-target-min"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Show QR Pass</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={getDirectionsUrl(booking)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface hover:bg-bg-elevated text-text-primary border border-border transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
                            title="Navigate to Bay"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setCancelModalBooking(booking)}
                            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-border transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    ) : booking.status === 'COMPLETED' ? (
                      <button
                        type="button"
                        onClick={() => setReviewModalBooking(booking)}
                        className="w-full py-2.5 min-h-[44px] rounded-xl bg-surface hover:bg-bg-elevated text-text-primary border border-border font-bold text-xs flex items-center justify-center gap-1.5 shadow-luxury-sm cursor-pointer touch-target-min"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>Write Bay Review</span>
                      </button>
                    ) : (
                      <span className="text-xs text-text-muted italic">Session closed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Code Pass Modal */}
      {selectedBookingQR && (
        <Modal isOpen={Boolean(selectedBookingQR)} onClose={() => setSelectedBookingQR(null)} title="Gate Entry Pass">
          <div className="space-y-6 text-center py-2">
            <div>
              <h3 className="font-editorial text-xl font-bold text-text-primary">
                {selectedBookingQR.chargerId?.title || '16A Two-Wheeler Bay'}
              </h3>
              <p className="text-xs text-text-secondary">{selectedBookingQR.chargerId?.address}</p>
            </div>

            <div className="w-full max-w-[240px] mx-auto p-5 bg-white rounded-3xl border border-border flex flex-col items-center justify-center shadow-luxury-md">
              <QRCodeSVG
                value={JSON.stringify({
                  bookingId: selectedBookingQR._id,
                  bookingCode: selectedBookingQR.bookingCode,
                  chargerId: selectedBookingQR.chargerId?._id,
                })}
                size={180}
              />
              <span className="text-xs font-extrabold text-slate-900 block mt-3 font-mono">
                PASS CODE: {selectedBookingQR.bookingCode}
              </span>
            </div>

            <p className="text-xs text-text-secondary max-w-xs mx-auto">
              Show this pass to security guards or apartment gate personnel for immediate two-wheeler parking access.
            </p>
          </div>
        </Modal>
      )}

      {/* Cancel Refund Modal */}
      {cancelModalBooking && (
        <Modal isOpen={Boolean(cancelModalBooking)} onClose={() => { setCancelModalBooking(null); setCancelError(null); }} title="Cancel Reservation">
          <div className="space-y-4">
            {cancelError && (
              <ErrorAlert
                error={cancelError}
                onDismiss={() => setCancelError(null)}
              />
            )}
            {(() => {
              const { percent, amount, diffHours } = getRefundEstimate(cancelModalBooking);
              return (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-text-primary space-y-1.5">
                  <span className="font-bold block text-amber-600 dark:text-amber-400">Refund Estimation:</span>
                  <p className="text-text-secondary">
                    Your slot starts in ~{Math.max(0, diffHours).toFixed(1)} hours. Under Bengaluru cancellation guidelines:
                  </p>
                  <p className="font-extrabold text-amber-600 dark:text-amber-300 text-sm">
                    {percent}% Refund: ₹{amount} of ₹{cancelModalBooking.totalAmount}
                  </p>
                </div>
              );
            })()}

            <div>
              <label htmlFor="cancelReasonSelect" className="text-xs font-bold text-text-primary block mb-1">
                Reason for cancellation:
              </label>
              <select
                id="cancelReasonSelect"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-input-border text-xs text-input-text bg-input-bg focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="Schedule changed">Schedule changed</option>
                <option value="Vehicle already charged elsewhere">Charged elsewhere</option>
                <option value="Emergency resolved">Emergency resolved</option>
                <option value="Booked incorrect bay">Booked incorrect bay</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary bg-surface hover:bg-bg-elevated cursor-pointer"
              >
                Keep Pass
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelBooking}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
              >
                {cancelling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Write Review Modal */}
      {reviewModalBooking && (
        <Modal isOpen={Boolean(reviewModalBooking)} onClose={() => { setReviewModalBooking(null); setReviewError(null); }} title="Rate Your Charge Session">
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {reviewError && (
              <ErrorAlert
                error={reviewError}
                onDismiss={() => setReviewError(null)}
              />
            )}
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-text-secondary block">How was the 16A socket and parking bay?</span>
              <div className="flex justify-center gap-2 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= (hoverRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-border-strong'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="revComment" className="text-xs font-bold text-text-primary block mb-1">
                Your Feedback:
              </label>
              <textarea
                id="revComment"
                rows="3"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Earthing status, security guard cooperation, socket access ease..."
                className="w-full p-3 rounded-xl border border-input-border text-xs text-input-text bg-input-bg focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            {reviewSuccessMsg && (
              <p className="text-xs text-brand font-bold text-center">{reviewSuccessMsg}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary bg-surface hover:bg-bg-elevated cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-brand-contrast bg-brand hover:opacity-90 cursor-pointer"
              >
                {reviewSubmitting ? 'Submitting...' : 'Post Review'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
