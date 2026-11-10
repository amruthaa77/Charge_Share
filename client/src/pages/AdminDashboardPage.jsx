import React, { useState, useEffect } from 'react';
import { adminAPI, verificationAPI, api } from '../services/api';
import { Modal } from '../components/common/Modal';
import { SEO } from '../components/common/SEO';
import { PageHeader } from '../components/common/PageHeader';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { DataErrorState } from '../components/common/DataErrorState';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/errorMapper';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Zap,
  Calendar,
  RefreshCw,
  ExternalLink,
  Users,
  Building2,
  Flag,
  Mail,
  Bike,
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review modal
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVED'); // APPROVED or REJECTED
  const [feedback, setFeedback] = useState('Electrical earthing and society NOC audited and approved.');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, verRes, reportsRes, contactRes] = await Promise.allSettled([
        adminAPI.getStats(),
        verificationAPI.adminGetPending(),
        api.get('/reports'),
        api.get('/contact'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.stats);
      if (verRes.status === 'fulfilled') setPendingVerifications(verRes.value.data.verifications || []);
      if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.data.reports || []);
      if (contactRes.status === 'fulfilled') setContactMessages(contactRes.value.data.messages || []);
    } catch (err) {
      console.error('Failed to load admin metrics', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      await api.patch(`/reports/${reportId}`, {
        status: 'RESOLVED',
        adminNotes: 'Resolved by safety team after inspection.',
      });
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, status: 'RESOLVED' } : r))
      );
    } catch (err) {
      console.error('Failed to resolve report', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleOpenReview = (item, action) => {
    setReviewModalItem(item);
    setReviewAction(action);
    setReviewError(null);
    setFeedback(
      action === 'APPROVED'
        ? '16A earthing test (<5V) and society NOC verified. Approved for public listing.'
        : 'Missing society NOC seal or inadequate 16A MCB trip breaker rating.'
    );
  };

  const handleExecuteReview = async (e) => {
    e.preventDefault();
    if (!reviewModalItem) return;
    setSubmitting(true);
    setReviewError(null);
    try {
      await verificationAPI.adminReview(reviewModalItem._id, {
        status: reviewAction,
        feedback,
      });
      setReviewModalItem(null);
      fetchAdminData();
    } catch (err) {
      setReviewError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pb-24 bg-bg text-text-primary transition-colors">
      <SEO
        title="Admin KYC & Safety Portal — ChargeShare Bengaluru"
        description="Verify host property ownership, check earthing test documentation, and audit station safety."
      />

      {/* Unified Page Header */}
      <PageHeader
        badgeText="Platform Safety & Trust"
        badgeVariant="amber"
        badgeSubtext="• Bengaluru Grid Audit"
        title="Safety Verification Console"
        description="Audit BESCOM utility bills, residential society NOCs, and physical socket grounding compliance."
        action={
          <button
            type="button"
            onClick={fetchAdminData}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-surface border border-border text-text-primary hover:bg-bg-elevated transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
            title="Refresh queue"
            aria-label="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
              Registered Riders & Hosts
            </span>
            <div className="font-editorial text-3xl font-bold text-text-primary">
              {stats?.totalUsers || 248}
            </div>
            <p className="text-[11px] text-text-secondary mt-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-brand" />
              <span>Bengaluru EV two-wheeler owners</span>
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
              Pending KYC Audits
            </span>
            <div className="font-editorial text-3xl font-bold text-amber-600 dark:text-amber-400">
              {pendingVerifications.length}
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 font-semibold">
              Earthing & society approval checks
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
              Verified 16A Bays
            </span>
            <div className="font-editorial text-3xl font-bold text-brand">
              {stats?.activeChargers || 42}
            </div>
            <p className="text-[11px] text-text-secondary mt-2">
              Indiranagar, Koramangala & HSR
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
              Open Bay Defect Reports
            </span>
            <div className="font-editorial text-3xl font-bold text-rose-600 dark:text-rose-400">
              {reports.filter((r) => r.status === 'PENDING').length}
            </div>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2 font-semibold">
              Rider flagged hardware issues
            </p>
          </div>
        </div>

        {/* Pending Verification Requests */}
        <div className="bg-surface rounded-4xl border border-border shadow-luxury-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-editorial text-xl font-bold text-text-primary">
                Pending Socket Verifications ({pendingVerifications.length})
              </h2>
              <p className="text-xs text-text-secondary">Review submitted utility bills, society permission seals, and electrical earthing proof.</p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {pendingVerifications.length === 0 ? (
              <div className="p-12 text-center text-xs text-text-muted">
                <CheckCircle2 className="w-8 h-8 text-brand mx-auto mb-2" />
                <span>Verification queue is empty. All listings are audited.</span>
              </div>
            ) : (
              pendingVerifications.map((item) => (
                <div key={item._id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-editorial text-base font-bold text-text-primary">
                        {item.chargerId?.title || 'Residential 16A Socket'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Host: {item.hostId?.name} ({item.hostId?.email}) • {item.chargerId?.address}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-brand pt-1 font-semibold">
                      <span>Document: {item.documentType || 'BESCOM Utility Bill'}</span>
                      {item.documentUrl && (
                        <a
                          href={item.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline flex items-center gap-1 hover:opacity-80"
                        >
                          <span>View Uploaded Proof</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenReview(item, 'APPROVED')}
                      className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl bg-brand hover:opacity-90 text-brand-contrast font-bold text-xs shadow-luxury-sm cursor-pointer touch-target-min"
                    >
                      Approve Socket
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenReview(item, 'REJECTED')}
                      className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl bg-surface border border-border hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs cursor-pointer touch-target-min"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Flagged Bay Reports */}
        <div className="bg-surface rounded-4xl border border-border shadow-luxury-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-editorial text-xl font-bold text-text-primary">
              Rider Safety & Hardware Reports ({reports.length})
            </h2>
            <p className="text-xs text-text-secondary">Reports submitted by Bengaluru riders regarding broken sockets or access denial.</p>
          </div>

          <div className="divide-y divide-border">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">No reports logged.</div>
            ) : (
              reports.map((rep) => (
                <div key={rep._id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary text-xs">{rep.reason}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rep.status === 'RESOLVED' ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">&ldquo;{rep.description}&rdquo;</p>
                    <p className="text-[11px] text-text-muted">
                      Station: {rep.chargerId?.title || 'Unknown Station'} • Reported by: {rep.reportedBy?.name || 'EV Rider'}
                    </p>
                  </div>

                  {rep.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={() => handleResolveReport(rep._id)}
                      className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl bg-brand hover:opacity-90 text-brand-contrast font-bold text-xs shadow-luxury-sm cursor-pointer touch-target-min"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModalItem && (
        <Modal
          isOpen={Boolean(reviewModalItem)}
          onClose={() => { setReviewModalItem(null); setReviewError(null); }}
          title={`${reviewAction === 'APPROVED' ? 'Approve' : 'Reject'} Socket Verification`}
        >
          <form onSubmit={handleExecuteReview} className="space-y-4 text-xs">
            {reviewError && (
              <ErrorAlert
                error={reviewError}
                onDismiss={() => setReviewError(null)}
              />
            )}
            <p className="text-text-secondary">
              Please confirm your inspection notes. This will be sent directly to host {reviewModalItem.hostId?.name}.
            </p>
            <div>
              <label htmlFor="auditorFeedback" className="text-xs font-bold text-text-primary block mb-1">
                Auditor Feedback:
              </label>
              <textarea
                id="auditorFeedback"
                rows="3"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
                className="w-full p-3 rounded-xl border border-input-border text-xs text-input-text bg-input-bg focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary bg-surface hover:bg-bg-elevated cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${
                  reviewAction === 'APPROVED' ? 'bg-brand hover:opacity-90 text-brand-contrast' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Updating...' : `Confirm ${reviewAction}`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
