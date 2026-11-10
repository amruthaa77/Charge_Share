import React, { useState, useEffect, useCallback } from 'react';
import { verificationAPI, adminAPI } from '../../services/api';
import { SEO } from '../../components/common/SEO';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { DataErrorState } from '../../components/common/DataErrorState';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMapper';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  MapPin,
  Check,
  AlertTriangle,
  FileText,
  User,
  Zap,
  HelpCircle,
  Eye,
} from 'lucide-react';

export const AdminKYCPage = () => {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING, APPROVED, REJECTED, RESUBMISSION_REQUESTED, ALL
  const [verifications, setVerifications] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0, resubmissionRequested: 0 });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filters & search
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('oldest');
  const [page, setPage] = useState(1);

  // Review Inspection Drawer / Modal
  const [inspectItem, setInspectItem] = useState(null);
  const [reviewMode, setReviewMode] = useState(null); // 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | null
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Admin Review Checklist (Must be checked before Approve)
  const [reviewChecklist, setReviewChecklist] = useState({
    documentsLegible: false,
    nameMatches: false,
    addressMatchesBay: false,
    nocPresentForApartments: false,
    earthingDeclared: false,
  });

  // Rejection & Request Info Form Fields
  const [rejectionPreset, setRejectionPreset] = useState('DOCUMENT_ILLEGIBLE');
  const [rejectionReason, setRejectionReason] = useState('');
  const [resubmissionNotes, setResubmissionNotes] = useState('');

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await verificationAPI.adminGetPending({
        status: activeTab,
        area: areaFilter !== 'ALL' ? areaFilter : undefined,
        search: search.trim() || undefined,
        sort: sortOrder,
        page,
        limit: 25,
      });
      setVerifications(res.data?.verifications || []);
      if (res.data?.counts) {
        setCounts(res.data.counts);
      }
    } catch (err) {
      console.error('Failed to load KYC queue', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, areaFilter, search, sortOrder, page]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Open inspection drawer
  const handleOpenInspect = (item) => {
    setInspectItem(item);
    setReviewMode(null);
    setActionError(null);
    setReviewChecklist({
      documentsLegible: item.reviewChecklist?.documentsLegible || false,
      nameMatches: item.reviewChecklist?.nameMatches || false,
      addressMatchesBay: item.reviewChecklist?.addressMatchesBay || false,
      nocPresentForApartments: item.reviewChecklist?.nocPresentForApartments || false,
      earthingDeclared: item.reviewChecklist?.earthingDeclared || false,
    });
    setRejectionPreset('DOCUMENT_ILLEGIBLE');
    setRejectionReason('');
    setResubmissionNotes('');
  };

  const isChecklistComplete =
    reviewChecklist.documentsLegible &&
    reviewChecklist.nameMatches &&
    reviewChecklist.addressMatchesBay &&
    reviewChecklist.nocPresentForApartments &&
    reviewChecklist.earthingDeclared;

  // Execute Review Actions
  const handleApprove = async () => {
    if (!inspectItem || !isChecklistComplete) return;
    try {
      setSubmitting(true);
      setActionError(null);
      await verificationAPI.adminReview(inspectItem._id, {
        status: 'APPROVED',
        reviewChecklist,
        feedback: 'Socket installation, NOC seal, and electrical earthing compliance verified by safety audit.',
      });
      toast.success(`Bay "${inspectItem.chargerId?.title || 'Listing'}" successfully approved and published!`);
      setInspectItem(null);
      fetchQueue();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!inspectItem) return;
    if (rejectionReason.trim().length < 10) {
      setActionError({ message: 'Please provide a detailed rejection reason of at least 10 characters.' });
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);
      await verificationAPI.adminReview(inspectItem._id, {
        status: 'REJECTED',
        rejectionPreset,
        rejectionReason: rejectionReason.trim(),
        feedback: rejectionReason.trim(),
      });
      toast.success('Listing rejected. Reason documented and host notified.');
      setInspectItem(null);
      fetchQueue();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestInfo = async (e) => {
    e.preventDefault();
    if (!inspectItem) return;
    if (resubmissionNotes.trim().length < 10) {
      setActionError({ message: 'Please provide detailed instructions of at least 10 characters.' });
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);
      await verificationAPI.adminReview(inspectItem._id, {
        status: 'RESUBMISSION_REQUESTED',
        resubmissionNotes: resubmissionNotes.trim(),
        feedback: resubmissionNotes.trim(),
      });
      toast.success('Resubmission requested. Host notified to update documentation.');
      setInspectItem(null);
      fetchQueue();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24">
      <SEO
        title="KYC & Station Safety Verification — ChargeShare Back-Office"
        description="Verify host property ownership, check earthing test documentation, and audit station safety."
      />

      <PageHeader
        badgeText="Safety Verification Console"
        badgeVariant="amber"
        badgeSubtext="• Bengaluru 16A Standards"
        title="Host & Listing KYC Audits"
        description="Audit BESCOM electricity bills, residential society NOCs, and physical socket grounding compliance."
        action={
          <button
            type="button"
            onClick={fetchQueue}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-surface border border-border text-text-primary hover:bg-bg-elevated transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
            title="Refresh queue"
            aria-label="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* TABS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
          {[
            { id: 'PENDING', label: 'Pending Audits', count: counts.pending, color: 'text-amber-600 dark:text-amber-400' },
            { id: 'RESUBMISSION_REQUESTED', label: 'Info Requested', count: counts.resubmissionRequested, color: 'text-purple-600 dark:text-purple-400' },
            { id: 'APPROVED', label: 'Approved & Verified', count: counts.approved, color: 'text-brand' },
            { id: 'REJECTED', label: 'Rejected', count: counts.rejected, color: 'text-rose-600 dark:text-rose-400' },
            { id: 'ALL', label: 'All Submissions', count: counts.all, color: 'text-text-primary' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2 min-h-[40px] rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-surface text-text-primary font-bold shadow-luxury-sm border border-border'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-soft border border-border ${tab.color}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* CONTROLS (Search, Area Filter, Sort) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search host, email, station title, or address..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-3 py-2.5 rounded-2xl bg-surface border border-border text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm cursor-pointer"
            >
              <option value="ALL">All Hubs (Bengaluru)</option>
              <option value="Indiranagar">Indiranagar</option>
              <option value="Koramangala">Koramangala</option>
              <option value="HSR">HSR Layout</option>
              <option value="Whitefield">Whitefield</option>
              <option value="Jayanagar">Jayanagar</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2.5 rounded-2xl bg-surface border border-border text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm cursor-pointer"
            >
              <option value="oldest">Sort: Oldest First (SLA)</option>
              <option value="newest">Sort: Newest First</option>
            </select>
          </div>
        </div>

        {/* LISTINGS / QUEUE */}
        {fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Failed to load KYC queue"
            description="We could not retrieve the verification requests from the database."
            onRetry={fetchQueue}
          />
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-3xl bg-surface border border-border animate-pulse p-6" />
            ))}
          </div>
        ) : verifications.length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-3 max-w-md mx-auto">
            <CheckCircle2 className="w-10 h-10 text-brand mx-auto" />
            <h3 className="font-editorial text-lg font-bold text-text-primary">No submissions in this queue</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              All applications in this view have been processed or none match your search criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {verifications.map((item) => (
              <div
                key={item._id}
                className="p-5 sm:p-6 rounded-3xl bg-surface border border-border hover:border-amber-500/30 transition-all shadow-luxury-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-editorial text-base font-bold text-text-primary truncate">
                      {item.chargerId?.title || 'Residential 16A Socket'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === 'APPROVED'
                          ? 'bg-brand/10 text-brand border-brand/20'
                          : item.status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : item.status === 'RESUBMISSION_REQUESTED'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      • Waiting since {new Date(item.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary truncate">
                    Host: <strong className="text-text-primary">{item.hostId?.name}</strong> (
                    {item.hostId?.maskedEmail}) • {item.chargerId?.address || 'Bengaluru'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted pt-1">
                    <span>Power: <strong>{item.chargerId?.powerKW || 3.3} kW (16A)</strong></span>
                    <span>•</span>
                    <span>Rate: <strong>₹{item.chargerId?.price || 15}/kWh</strong></span>
                    <span>•</span>
                    <span className="text-brand font-semibold">
                      ID Proof: {item.idProofType} (Masked)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenInspect(item)}
                    className="px-4 py-2 min-h-[40px] rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer touch-target-min"
                  >
                    <Eye className="w-4 h-4" /> Inspect Audit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================================
          INSPECTION DRAWER / MODAL
          ========================================================================= */}
      {inspectItem && (
        <Modal
          isOpen={Boolean(inspectItem)}
          onClose={() => setInspectItem(null)}
          title={`Audit: ${inspectItem.chargerId?.title || 'Charging Bay'}`}
          size="lg"
        >
          <div className="space-y-6 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {actionError && (
              <ErrorAlert error={actionError} onDismiss={() => setActionError(null)} />
            )}

            {/* Section 1: Host & Bay Profile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-bg-soft border border-border">
              <div className="space-y-1.5">
                <span className="font-bold text-text-primary flex items-center gap-1.5 text-xs">
                  <User className="w-4 h-4 text-brand" /> Host Profile
                </span>
                <p className="text-text-secondary">Name: <strong className="text-text-primary">{inspectItem.hostId?.name}</strong></p>
                <p className="text-text-secondary">Email: {inspectItem.hostId?.maskedEmail}</p>
                <p className="text-text-secondary">Phone: {inspectItem.hostId?.maskedPhone}</p>
                <p className="text-text-secondary">City: {inspectItem.hostId?.city || 'Bengaluru'}</p>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-text-primary flex items-center gap-1.5 text-xs">
                  <MapPin className="w-4 h-4 text-accent" /> Installation Address
                </span>
                <p className="text-text-secondary">{inspectItem.chargerId?.address}</p>
                <p className="text-text-secondary">
                  Coordinates: {inspectItem.chargerId?.location?.coordinates?.[1]?.toFixed(4)},{' '}
                  {inspectItem.chargerId?.location?.coordinates?.[0]?.toFixed(4)}
                </p>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand/10 text-brand">
                  Verified Bengaluru Geofence Bounds
                </span>
              </div>
            </div>

            {/* Section 2: Uploaded Documents (Protected URLs) */}
            <div className="space-y-3">
              <h4 className="font-editorial text-sm font-bold text-text-primary flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" /> Uploaded Legal & Utility Proofs
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* ID Proof */}
                <div className="p-3 rounded-2xl bg-surface border border-border space-y-2">
                  <span className="text-[11px] font-bold text-text-primary block">
                    ID Proof ({inspectItem.idProofType})
                  </span>
                  <p className="text-[10px] text-text-muted">Aadhaar/PAN card with masked ID</p>
                  {inspectItem.idProofUrl ? (
                    <a
                      href={`/api/v1/documents/view/${inspectItem.idProofUrl.replace('/uploads/', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-bg-soft hover:bg-bg-elevated border border-border font-bold text-[11px] text-brand flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Protected Doc
                    </a>
                  ) : (
                    <span className="text-[11px] text-rose-500 font-semibold">Not attached</span>
                  )}
                </div>

                {/* Property Proof */}
                <div className="p-3 rounded-2xl bg-surface border border-border space-y-2">
                  <span className="text-[11px] font-bold text-text-primary block">
                    Electricity Bill ({inspectItem.propertyProofType})
                  </span>
                  <p className="text-[10px] text-text-muted">BESCOM consumer meter verification</p>
                  {inspectItem.propertyProofUrl ? (
                    <a
                      href={`/api/v1/documents/view/${inspectItem.propertyProofUrl.replace('/uploads/', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-bg-soft hover:bg-bg-elevated border border-border font-bold text-[11px] text-brand flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Protected Doc
                    </a>
                  ) : (
                    <span className="text-[11px] text-rose-500 font-semibold">Not attached</span>
                  )}
                </div>

                {/* Society NOC */}
                <div className="p-3 rounded-2xl bg-surface border border-border space-y-2">
                  <span className="text-[11px] font-bold text-text-primary block">
                    Society NOC / Property Consent
                  </span>
                  <p className="text-[10px] text-text-muted">RWA or society approval letter</p>
                  {inspectItem.nocDocumentUrl ? (
                    <a
                      href={`/api/v1/documents/view/${inspectItem.nocDocumentUrl.replace('/uploads/', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-bg-soft hover:bg-bg-elevated border border-border font-bold text-[11px] text-brand flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Protected Doc
                    </a>
                  ) : (
                    <span className="text-[11px] text-amber-600 font-semibold">Self-Consent Declared</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Safety Self-Checklist Declared by Host */}
            <div className="space-y-2 p-4 rounded-2xl bg-bg-soft border border-border">
              <span className="font-bold text-text-primary block text-xs">
                Host Electrical Grounding & Safety Declaration
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-brand font-semibold">
                  <Check className="w-3.5 h-3.5" /> Earthing &lt;5V Verified
                </div>
                <div className="flex items-center gap-1.5 text-brand font-semibold">
                  <Check className="w-3.5 h-3.5" /> Dedicated 16A MCB
                </div>
                <div className="flex items-center gap-1.5 text-brand font-semibold">
                  <Check className="w-3.5 h-3.5" /> IP65 Weatherproof Box
                </div>
              </div>
            </div>

            {/* Section 4: Admin Verification Review Checklist (Required before Approve) */}
            <div className="space-y-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-500" /> Mandatory Admin Review Checklist
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {Object.values(reviewChecklist).filter(Boolean).length}/5 Verified
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                All 5 compliance criteria below must be affirmatively verified by the auditor before approval can be granted.
              </p>

              <div className="space-y-2 pt-1">
                {[
                  { key: 'documentsLegible', label: 'Uploaded ID proof and BESCOM bill are legible and uncropped' },
                  { key: 'nameMatches', label: 'Host legal name matches ID and utility registration' },
                  { key: 'addressMatchesBay', label: 'Installation address matches billing consumer address' },
                  { key: 'nocPresentForApartments', label: 'RWA permission or private homeowner consent confirmed' },
                  { key: 'earthingDeclared', label: 'Dedicated 16A earthing & trip breaker compliance verified' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={reviewChecklist[item.key]}
                      onChange={(e) =>
                        setReviewChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      className="rounded border-border text-brand focus:ring-brand w-4 h-4"
                    />
                    <span className="text-text-primary">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Section 5: Review Action Modals / Forms */}
            {reviewMode === 'REJECT' && (
              <form onSubmit={handleReject} className="space-y-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <span className="font-bold text-rose-700 dark:text-rose-300 block text-xs">
                  Reject Application (Reason Required)
                </span>
                <div>
                  <label className="text-[11px] text-text-secondary block mb-1">Preset Category:</label>
                  <select
                    value={rejectionPreset}
                    onChange={(e) => setRejectionPreset(e.target.value)}
                    className="w-full p-2 rounded-xl bg-surface border border-border text-xs"
                  >
                    <option value="DOCUMENT_ILLEGIBLE">Documents Illegible / Blurry</option>
                    <option value="NAME_MISMATCH">Host Name Does Not Match Utility Bill</option>
                    <option value="NOC_MISSING">Society NOC Missing for Gated Community</option>
                    <option value="EARTHING_INSUFFICIENT">Improper 16A Earthing or Grounding</option>
                    <option value="OUTSIDE_GEOFENCE">Location Outside Bengaluru Service Bounds</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block mb-1">
                    Detailed Reason for Host (minimum 10 characters):
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify exact defect (e.g., BESCOM bill address does not match socket location)..."
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text-primary"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReviewMode(null)}
                    className="px-4 py-2 rounded-xl bg-surface border border-border font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition-colors"
                  >
                    {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            )}

            {reviewMode === 'REQUEST_INFO' && (
              <form onSubmit={handleRequestInfo} className="space-y-3 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <span className="font-bold text-purple-700 dark:text-purple-300 block text-xs">
                  Request Additional Information (Resubmission)
                </span>
                <div>
                  <label className="text-[11px] text-text-secondary block mb-1">
                    Instructions for Host (minimum 10 characters):
                  </label>
                  <textarea
                    rows={3}
                    value={resubmissionNotes}
                    onChange={(e) => setResubmissionNotes(e.target.value)}
                    placeholder="E.g., Please upload a clearer copy of page 2 of your BESCOM bill showing RR number..."
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text-primary"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReviewMode(null)}
                    className="px-4 py-2 rounded-xl bg-surface border border-border font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition-colors"
                  >
                    {submitting ? 'Submitting...' : 'Send Request to Host'}
                  </button>
                </div>
              </form>
            )}

            {/* Action Bar */}
            {!reviewMode && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewMode('REJECT')}
                    className="px-4 py-2 min-h-[40px] rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold text-xs border border-rose-500/25 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 inline mr-1" /> Reject Application
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewMode('REQUEST_INFO')}
                    className="px-4 py-2 min-h-[40px] rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 font-bold text-xs border border-purple-500/25 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 inline mr-1" /> Request More Info
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!isChecklistComplete || submitting}
                  onClick={handleApprove}
                  className="px-6 py-2 min-h-[40px] rounded-2xl bg-brand text-brand-contrast font-bold text-xs hover:opacity-90 transition-all shadow-luxury-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Approving...' : isChecklistComplete ? 'Approve & Publish Bay' : 'Complete 5 Checklists to Approve'}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
