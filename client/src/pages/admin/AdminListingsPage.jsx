import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { SEO } from '../../components/common/SEO';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { DataErrorState } from '../../components/common/DataErrorState';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMapper';
import {
  Zap,
  Search,
  Filter,
  RefreshCw,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Eye,
  MapPin,
} from 'lucide-react';

export const AdminListingsPage = () => {
  const toast = useToast();

  const [chargers, setChargers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Suspend / Relist Modal
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState('suspend'); // 'suspend' or 'relist'
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchChargers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminAPI.listChargers({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search.trim() || undefined,
        page,
        limit: 25,
      });
      setChargers(res.data?.chargers || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to load chargers list', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchChargers();
  }, [fetchChargers]);

  const handleOpenAction = (item, type) => {
    setActionItem(item);
    setActionType(type);
    setActionReason('');
    setActionError(null);
  };

  const handleExecuteAction = async (e) => {
    e.preventDefault();
    if (actionType === 'suspend' && (!actionReason || actionReason.trim().length < 5)) {
      setActionError({ message: 'A suspension reason of at least 5 characters is required.' });
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);
      await adminAPI.toggleChargerSuspend(actionItem._id, {
        action: actionType,
        reason: actionReason.trim(),
      });
      toast.success(actionType === 'suspend' ? 'Listing suspended' : 'Listing re-listed');
      setActionItem(null);
      fetchChargers();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24">
      <SEO
        title="Host Listings Management — ChargeShare Back-Office"
        description="Monitor residential sockets, audit compliance, and manage bay availability."
      />

      <PageHeader
        badgeText="Station Inventory"
        badgeVariant="amber"
        badgeSubtext="• Bengaluru Grid"
        title="Charging Bays & Listings"
        description="Audit all residential and society 16A sockets, verify pricing compliance, and manage suspensions."
        action={
          <button
            type="button"
            onClick={fetchChargers}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-surface border border-border text-text-primary hover:bg-bg-elevated transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
            title="Refresh listings"
            aria-label="Refresh listings"
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
              placeholder="Search station title or address..."
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
            <option value="ALL">All Listing Statuses</option>
            <option value="VERIFIED">Verified & Active</option>
            <option value="PENDING_VERIFICATION">Pending Audit</option>
            <option value="SUSPENDED">Suspended / Unlisted</option>
            <option value="PAUSED">Host Paused</option>
            <option value="REJECTED">Audit Rejected</option>
          </select>
        </div>

        {/* Listings Table */}
        {fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Failed to load chargers"
            description="We could not retrieve the bay listings from the database."
            onRetry={fetchChargers}
          />
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-3xl bg-surface border border-border animate-pulse p-4" />
            ))}
          </div>
        ) : chargers.length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-3 max-w-md mx-auto">
            <Zap className="w-10 h-10 text-brand mx-auto" />
            <h3 className="font-editorial text-lg font-bold text-text-primary">No listings found</h3>
            <p className="text-xs text-text-secondary">No charging stations matched your filter criteria.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-4xl border border-border shadow-luxury-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between text-xs font-bold text-text-muted">
              <span>Showing {chargers.length} of {total} Listings</span>
            </div>

            <div className="divide-y divide-border">
              {chargers.map((c) => (
                <div
                  key={c._id}
                  className="p-5 hover:bg-bg-soft transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="font-editorial text-base font-bold text-text-primary truncate">
                        {c.title}
                      </strong>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status === 'VERIFIED'
                            ? 'bg-brand/10 text-brand border-brand/20'
                            : c.status === 'SUSPENDED'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <p className="text-text-secondary truncate">
                      Host: {c.hostId?.name} ({c.hostId?.email || 'N/A'}) • {c.address}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                      <span>Power: <strong>{c.powerKW} kW</strong></span>
                      <span>•</span>
                      <span>Rate: <strong>₹{c.price}/kWh</strong></span>
                      <span>•</span>
                      <span>City: <strong>{c.city}</strong></span>
                      {c.adminSuspendReason && (
                        <span className="text-rose-500 font-semibold truncate">
                          Suspend Reason: &quot;{c.adminSuspendReason}&quot;
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {c.status === 'SUSPENDED' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAction(c, 'relist')}
                        className="px-4 py-2 rounded-2xl bg-brand/10 text-brand border border-brand/25 font-bold text-xs hover:bg-brand/20 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Re-list Bay
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenAction(c, 'suspend')}
                        className="px-4 py-2 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 font-bold text-xs hover:bg-rose-500/20 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5 inline mr-1" /> Suspend
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suspend / Relist Modal */}
      {actionItem && (
        <Modal
          isOpen={Boolean(actionItem)}
          onClose={() => setActionItem(null)}
          title={actionType === 'suspend' ? 'Suspend Charging Station' : 'Re-list Charging Station'}
        >
          <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
            {actionError && <ErrorAlert error={actionError} onDismiss={() => setActionError(null)} />}

            <p className="text-text-secondary leading-relaxed">
              {actionType === 'suspend'
                ? `Suspending "${actionItem.title}" will remove it from rider search and explore maps. Future bookings will be preserved or refunded in accordance with platform policy.`
                : `Re-listing "${actionItem.title}" will restore public visibility on explore maps and allow instant slot reservations.`}
            </p>

            {actionType === 'suspend' && (
              <div>
                <label className="font-bold text-text-primary block mb-1">
                  Suspension Reason (minimum 5 characters):
                </label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="E.g., Host unresponsiveness or hardware ground trip hazard reported by riders..."
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text-primary"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionItem(null)}
                className="px-4 py-2 rounded-xl bg-surface border border-border font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors ${
                  actionType === 'suspend'
                    ? 'bg-rose-600 text-white hover:bg-rose-500'
                    : 'bg-brand text-brand-contrast hover:opacity-90'
                }`}
              >
                {submitting ? 'Updating...' : actionType === 'suspend' ? 'Confirm Suspension' : 'Confirm Re-list'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
