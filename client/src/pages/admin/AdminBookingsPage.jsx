import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { SEO } from '../../components/common/SEO';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { DataErrorState } from '../../components/common/DataErrorState';
import {
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Zap,
} from 'lucide-react';

export const AdminBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Detail Drawer
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminAPI.listBookings({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search.trim() || undefined,
        page,
        limit: 25,
      });
      setBookings(res.data?.bookings || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to load bookings', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return (
    <div className="pb-24">
      <SEO
        title="Bookings & Session Timeline — ChargeShare Back-Office"
        description="Monitor real-time EV charging reservations, audit hold lifecycles, and inspect status transitions."
      />

      <PageHeader
        badgeText="Reservation Telemetry"
        badgeVariant="amber"
        badgeSubtext="• 60-Min Discrete Slots"
        title="Bookings & Charging Passes"
        description="Search platform reservations, inspect slot double-booking locks, and audit session timelines."
        action={
          <button
            type="button"
            onClick={fetchBookings}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-surface border border-border text-text-primary hover:bg-bg-elevated transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
            title="Refresh bookings"
            aria-label="Refresh bookings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by 8-digit Booking Code..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 rounded-2xl bg-surface border border-border text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm cursor-pointer"
          >
            <option value="ALL">All Session Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ACTIVE">Active (In Session)</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PENDING_PAYMENT">Pending Payment / Held</option>
          </select>
        </div>

        {/* Bookings Table */}
        {fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Failed to load bookings"
            description="We could not retrieve reservations from the database."
            onRetry={fetchBookings}
          />
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-3xl bg-surface border border-border animate-pulse p-4" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-3 max-w-md mx-auto">
            <Calendar className="w-10 h-10 text-brand mx-auto" />
            <h3 className="font-editorial text-lg font-bold text-text-primary">No bookings found</h3>
            <p className="text-xs text-text-secondary">No reservations matched your criteria.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-4xl border border-border shadow-luxury-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between text-xs font-bold text-text-muted">
              <span>Showing {bookings.length} of {total} Reservations</span>
            </div>

            <div className="divide-y divide-border">
              {bookings.map((b) => (
                <div
                  key={b._id}
                  className="p-5 hover:bg-bg-soft transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-bold text-text-primary tracking-wide">
                        {b.bookingCode}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          b.status === 'CONFIRMED' || b.status === 'COMPLETED'
                            ? 'bg-brand/10 text-brand border-brand/20'
                            : b.status === 'CANCELLED'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {b.status}
                      </span>
                      {b.isEmergency && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-600 text-white animate-pulse">
                          SOS EMERGENCY
                        </span>
                      )}
                    </div>

                    <p className="text-text-secondary truncate">
                      Rider: <strong className="text-text-primary">{b.userId?.name || 'Rider'}</strong> •{' '}
                      Station: {b.chargerId?.title || '16A Bay'} ({b.chargerId?.address || 'Bengaluru'})
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                      <span>
                        Slot: {new Date(b.slotStart).toLocaleDateString('en-IN')} (
                        {new Date(b.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.slotEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                      <span>•</span>
                      <span>Host: <strong>{b.hostId?.name || 'Host'}</strong></span>
                      <span>•</span>
                      <span className="text-brand font-bold">₹{b.totalAmount} (5% Fee: ₹{b.platformFee})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedBooking(b)}
                      className="px-4 py-2 min-h-[40px] rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer touch-target-min"
                    >
                      <Eye className="w-3.5 h-3.5" /> Timeline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking Detail Modal with Timeline */}
      {selectedBooking && (
        <Modal
          isOpen={Boolean(selectedBooking)}
          onClose={() => setSelectedBooking(null)}
          title={`Reservation: ${selectedBooking.bookingCode}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-bg-soft border border-border">
              <div>
                <span className="font-bold text-text-primary block mb-1">Rider Information</span>
                <p>{selectedBooking.userId?.name}</p>
                <p className="text-text-muted">{selectedBooking.userId?.email}</p>
                <p className="text-text-muted">{selectedBooking.userId?.phone}</p>
              </div>
              <div>
                <span className="font-bold text-text-primary block mb-1">Host & Socket</span>
                <p>{selectedBooking.hostId?.name}</p>
                <p className="text-text-muted">{selectedBooking.chargerId?.title}</p>
                <p className="text-text-muted">{selectedBooking.chargerId?.address}</p>
              </div>
            </div>

            {/* Financial Details */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5">
              <span className="font-bold text-text-primary block mb-1">Payment Breakdown</span>
              <div className="flex justify-between">
                <span className="text-text-secondary">Base Energy Charge:</span>
                <span>₹{selectedBooking.baseAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Platform Facilitation Fee (5%):</span>
                <span className="text-brand font-bold">₹{selectedBooking.platformFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Host Payout:</span>
                <span>₹{selectedBooking.hostEarnings}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-bold text-text-primary">
                <span>Total Paid:</span>
                <span>₹{selectedBooking.totalAmount}</span>
              </div>
              {selectedBooking.refundAmount > 0 && (
                <div className="flex justify-between text-rose-500 font-bold pt-1">
                  <span>Refund Issued:</span>
                  <span>₹{selectedBooking.refundAmount}</span>
                </div>
              )}
            </div>

            {/* Lifecycle Timeline */}
            <div className="space-y-2 p-4 rounded-2xl bg-bg-soft border border-border">
              <span className="font-bold text-text-primary block mb-2">Session Lifecycle Timeline</span>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center gap-2 text-text-primary">
                  <Clock className="w-3.5 h-3.5 text-brand" />
                  <span>Created: {new Date(selectedBooking.createdAt).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-2 text-text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                  <span>Slot Window: {new Date(selectedBooking.slotStart).toLocaleTimeString()} - {new Date(selectedBooking.slotEnd).toLocaleTimeString()}</span>
                </div>
                {selectedBooking.cancelledAt && (
                  <div className="flex items-center gap-2 text-rose-500 font-semibold">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancelled at: {new Date(selectedBooking.cancelledAt).toLocaleString('en-IN')} ({selectedBooking.cancellationReason || 'User requested'})</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl bg-surface border border-border font-bold text-xs"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
