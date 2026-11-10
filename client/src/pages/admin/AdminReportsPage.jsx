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
  Flag,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Check,
} from 'lucide-react';

export const AdminReportsPage = () => {
  const toast = useToast();

  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Resolve Modal
  const [resolveItem, setResolveItem] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('RESOLVED');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminAPI.listReports({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page,
        limit: 25,
      });
      setReports(res.data?.reports || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to load defect reports', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpenResolve = (item) => {
    setResolveItem(item);
    setResolveStatus('RESOLVED');
    setAdminNotes(item.adminNotes || '');
    setActionError(null);
  };

  const handleExecuteResolve = async (e) => {
    e.preventDefault();
    if (!resolveItem) return;
    if (!adminNotes.trim()) {
      setActionError({ message: 'Please provide resolution notes explaining the safety outcome.' });
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);
      await adminAPI.resolveReport(resolveItem._id, {
        status: resolveStatus,
        adminNotes: adminNotes.trim(),
      });
      toast.success(`Report marked as ${resolveStatus}`);
      setResolveItem(null);
      fetchReports();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24">
      <SEO
        title="Hardware Reports & Disputes — ChargeShare Back-Office"
        description="Triage rider defect reports, audit electrical hazard claims, and track resolutions."
      />

      <PageHeader
        badgeText="Safety Incident Triage"
        badgeVariant="amber"
        badgeSubtext="• Community Defect Reports"
        title="Hardware Reports & Disputes"
        description="Inspect rider reports on broken sockets, ungrounded plugs, unresponsive hosts, and safety hazards."
        action={
          <button
            type="button"
            onClick={fetchReports}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-surface border border-border text-text-primary hover:bg-bg-elevated transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
            title="Refresh reports"
            aria-label="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Filter bar */}
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Report Queue ({total} Total)
          </span>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-2xl bg-surface border border-border text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm cursor-pointer"
          >
            <option value="ALL">All Report Standings</option>
            <option value="PENDING">Pending Triage</option>
            <option value="INVESTIGATING">Under Investigation</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>

        {/* Reports List */}
        {fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Failed to load reports"
            description="We could not retrieve defect reports from the database."
            onRetry={fetchReports}
          />
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-3xl bg-surface border border-border animate-pulse p-4" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-3 max-w-md mx-auto">
            <CheckCircle2 className="w-10 h-10 text-brand mx-auto" />
            <h3 className="font-editorial text-lg font-bold text-text-primary">Defect queue is clear</h3>
            <p className="text-xs text-text-secondary">No open hardware incidents or community disputes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r._id}
                className="p-5 rounded-3xl bg-surface border border-border hover:border-rose-500/30 transition-all shadow-luxury-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-xs">
                      {r.reason}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        r.status === 'RESOLVED'
                          ? 'bg-brand/10 text-brand border-brand/20'
                          : r.status === 'INVESTIGATING'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <p className="text-text-primary leading-relaxed">{r.description}</p>

                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-text-muted">
                    <span>Reported by: <strong>{r.reporterId?.name || 'Rider'}</strong></span>
                    <span>•</span>
                    <span>Station: {r.chargerId?.title || '16A Bay'}</span>
                    <span>•</span>
                    <span>Host: {r.chargerId?.hostId?.name || 'Host'}</span>
                    <span>•</span>
                    <span>Date: {new Date(r.createdAt).toLocaleString('en-IN')}</span>
                  </div>

                  {r.adminNotes && (
                    <div className="p-2.5 rounded-xl bg-bg-soft border border-border text-[11px] text-text-secondary">
                      <strong>Admin Resolution:</strong> {r.adminNotes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenResolve(r)}
                    className="px-4 py-2 min-h-[40px] rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer touch-target-min"
                  >
                    <Check className="w-4 h-4" /> Triage & Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolveItem && (
        <Modal
          isOpen={Boolean(resolveItem)}
          onClose={() => setResolveItem(null)}
          title={`Resolve Report: ${resolveItem.reason}`}
        >
          <form onSubmit={handleExecuteResolve} className="space-y-4 text-xs">
            {actionError && <ErrorAlert error={actionError} onDismiss={() => setActionError(null)} />}

            <div>
              <label className="font-bold text-text-primary block mb-1">Status:</label>
              <select
                value={resolveStatus}
                onChange={(e) => setResolveStatus(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs"
              >
                <option value="RESOLVED">Resolved (Issue Fixed / Inspected)</option>
                <option value="INVESTIGATING">Mark Under Investigation</option>
                <option value="DISMISSED">Dismiss (False Alarm / Inaccurate)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-text-primary block mb-1">Resolution Notes:</label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Document findings or corrective action taken..."
                className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text-primary"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolveItem(null)}
                className="px-4 py-2 rounded-xl bg-surface border border-border font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-brand text-brand-contrast font-bold text-xs hover:opacity-90 transition-all shadow-luxury-sm"
              >
                {submitting ? 'Saving...' : 'Save Resolution'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
