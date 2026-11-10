import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { SEO } from '../../components/common/SEO';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { DataErrorState } from '../../components/common/DataErrorState';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errorMapper';
import {
  User,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Zap,
  Bike,
  CreditCard,
  FileText,
  Clock,
  Plus,
  Ban,
  CheckCircle2,
  Flag,
  HelpCircle,
} from 'lucide-react';

export const AdminUserDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Trust status update modal
  const [trustModalOpen, setTrustModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('FLAGGED');
  const [statusReason, setStatusReason] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Internal admin note
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchUserDetail = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminAPI.getUserDetail(id);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load user detail', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUserDetail();
  }, [fetchUserDetail]);

  const handleOpenTrustModal = (status) => {
    setTargetStatus(status);
    setStatusReason('');
    setStatusError(null);
    setTrustModalOpen(true);
  };

  const handleUpdateTrustStatus = async (e) => {
    e.preventDefault();
    if (!statusReason || statusReason.trim().length < 5) {
      setStatusError({ message: 'Please provide an administrative reason of at least 5 characters.' });
      return;
    }

    try {
      setSubmittingStatus(true);
      setStatusError(null);
      await adminAPI.updateUserTrust(id, {
        trustStatus: targetStatus,
        reason: statusReason.trim(),
      });
      toast.success(`User standing updated to ${targetStatus}`);
      setTrustModalOpen(false);
      fetchUserDetail();
    } catch (err) {
      setStatusError(getErrorMessage(err));
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setSubmittingNote(true);
      await adminAPI.addUserNote(id, newNote.trim());
      setNewNote('');
      toast.success('Admin internal note appended successfully.');
      fetchUserDetail();
    } catch (err) {
      toast.error('Failed to add internal note');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (fetchError) {
    return (
      <div className="p-8">
        <DataErrorState
          error={fetchError}
          title="User not found"
          description="Could not locate this account profile in the database."
          onRetry={fetchUserDetail}
        />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-8 space-y-4 max-w-5xl mx-auto">
        <div className="h-28 rounded-3xl bg-surface border border-border animate-pulse" />
        <div className="h-64 rounded-3xl bg-surface border border-border animate-pulse" />
      </div>
    );
  }

  const { user, vehicles, chargers, recentBookings, reportsBy, reportsAgainst, auditTrail, kycRecord } = data;

  return (
    <div className="pb-24">
      <SEO
        title={`User: ${user.name} — ChargeShare Back-Office`}
        description="Comprehensive review of account legitimacy, telemetry, vehicles, and booking history."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Users Directory
        </Link>
      </div>

      <PageHeader
        badgeText={`Account: ${user.role}`}
        badgeVariant="amber"
        badgeSubtext={`• Standing: ${user.trustStatus}`}
        title={user.name}
        description={`Registered ${new Date(user.createdAt).toLocaleDateString('en-IN')} • Last active ${new Date(user.lastActive || user.createdAt).toLocaleDateString('en-IN')}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {user.trustStatus !== 'SUSPENDED' ? (
              <button
                type="button"
                onClick={() => handleOpenTrustModal('SUSPENDED')}
                className="px-4 py-2 min-h-[44px] rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 font-bold text-xs hover:bg-rose-500/20 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer touch-target-min"
              >
                <Ban className="w-4 h-4" /> Suspend Account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenTrustModal('VERIFIED')}
                className="px-4 py-2 min-h-[44px] rounded-2xl bg-brand/10 text-brand border border-brand/25 font-bold text-xs hover:bg-brand/20 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer touch-target-min"
              >
                <CheckCircle2 className="w-4 h-4" /> Reactivate User
              </button>
            )}

            {user.trustStatus !== 'FLAGGED' && (
              <button
                type="button"
                onClick={() => handleOpenTrustModal('FLAGGED')}
                className="px-4 py-2 min-h-[44px] rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-bold text-xs hover:bg-amber-500/20 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer touch-target-min"
              >
                <Flag className="w-4 h-4" /> Flag for Review
              </button>
            )}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Profile Summary & Security Standing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">
              Identity & Contact (Masked)
            </span>
            <div className="space-y-1.5 text-xs text-text-secondary">
              <p>Full Name: <strong className="text-text-primary">{user.name}</strong></p>
              <p>Email: <span className="font-mono">{user.maskedEmail}</span></p>
              <p>Phone: <span className="font-mono">{user.maskedPhone}</span></p>
              <p>City: {user.city}</p>
            </div>
            <div className="pt-2 border-t border-border flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.emailVerified ? 'bg-brand/10 text-brand' : 'bg-amber-500/10 text-amber-600'}`}>
                {user.emailVerified ? 'Email Verified' : 'Email Unverified'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.phoneVerified ? 'bg-brand/10 text-brand' : 'bg-amber-500/10 text-amber-600'}`}>
                {user.phoneVerified ? 'Phone Verified' : 'Phone Unverified'}
              </span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">
              Trust & Standing
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  user.trustStatus === 'VERIFIED'
                    ? 'bg-brand/10 text-brand border-brand/20'
                    : user.trustStatus === 'SUSPENDED'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}
              >
                {user.trustStatus}
              </span>
            </div>
            {user.trustReason && (
              <p className="text-xs text-text-secondary leading-relaxed bg-bg-soft p-3 rounded-2xl border border-border">
                Reason: &quot;{user.trustReason}&quot;
              </p>
            )}
            {user.trustUpdatedAt && (
              <p className="text-[11px] text-text-muted">
                Last reviewed: {new Date(user.trustUpdatedAt).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">
              KYC & Verification Status
            </span>
            {kycRecord ? (
              <div className="space-y-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {kycRecord.status}
                </span>
                <p className="text-text-secondary">Submitted: {new Date(kycRecord.createdAt).toLocaleDateString('en-IN')}</p>
                <Link
                  to="/admin/kyc"
                  className="inline-block text-xs text-brand font-bold hover:underline pt-1"
                >
                  View Full Verification Audit →
                </Link>
              </div>
            ) : (
              <p className="text-xs text-text-muted">
                {user.role === 'HOST' ? 'No verification documents submitted yet.' : 'Rider account (no heavy KYC required).'}
              </p>
            )}
          </div>
        </div>

        {/* Listings (Hosts) or Vehicles (Riders) */}
        {user.role === 'HOST' ? (
          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-4">
            <h3 className="font-editorial text-lg font-bold text-text-primary flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Host Charging Bays ({chargers.length})
            </h3>
            {chargers.length === 0 ? (
              <p className="text-xs text-text-muted">No charger bays listed.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {chargers.map((c) => (
                  <div key={c._id} className="p-4 rounded-2xl bg-bg-soft border border-border space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-text-primary">{c.title}</strong>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-bg-elevated border border-border">
                        {c.status}
                      </span>
                    </div>
                    <p className="text-text-secondary">{c.address}</p>
                    <p className="text-text-muted">{c.powerKW} kW • ₹{c.price}/kWh</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-4">
            <h3 className="font-editorial text-lg font-bold text-text-primary flex items-center gap-2">
              <Bike className="w-5 h-5 text-brand" /> Registered Two-Wheelers ({vehicles.length})
            </h3>
            {vehicles.length === 0 ? (
              <p className="text-xs text-text-muted">No vehicles added to garage.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vehicles.map((v) => (
                  <div key={v._id} className="p-4 rounded-2xl bg-bg-soft border border-border space-y-1 text-xs">
                    <strong className="text-text-primary">{v.make} {v.model}</strong>
                    <p className="font-mono text-text-secondary">{v.registrationNumber}</p>
                    <p className="text-text-muted">{v.batteryCapacityKWh || 3.7} kWh • {v.connectorType || '16A Indian 3-Pin'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Bookings & Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-4">
            <h3 className="font-editorial text-lg font-bold text-text-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand" /> Recent Bookings ({recentBookings.length})
            </h3>
            {recentBookings.length === 0 ? (
              <p className="text-xs text-text-muted">No booking history recorded.</p>
            ) : (
              <div className="space-y-2">
                {recentBookings.map((b) => (
                  <div key={b._id} className="p-3 rounded-2xl bg-bg-soft border border-border text-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-text-primary">{b.bookingCode}</span>
                      <p className="text-[11px] text-text-secondary">{b.chargerId?.title || 'Charging Bay'}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-brand">₹{b.totalAmount}</span>
                      <p className="text-[10px] text-text-muted">{b.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-4">
            <h3 className="font-editorial text-lg font-bold text-text-primary flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" /> Defect Reports & Disputes
            </h3>
            <div className="space-y-2 text-xs">
              <p className="text-text-secondary">Reports Filed by User: <strong className="text-text-primary">{reportsBy.length}</strong></p>
              <p className="text-text-secondary">Reports Filed Against Host: <strong className="text-text-primary">{reportsAgainst.length}</strong></p>
              {reportsAgainst.map((r) => (
                <div key={r._id} className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                  <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-300">
                    <span>{r.reason}</span>
                    <span className="text-[10px]">{r.status}</span>
                  </div>
                  <p className="text-text-secondary">{r.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Internal Admin Notes */}
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-4">
          <h3 className="font-editorial text-lg font-bold text-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" /> Internal Administrative Notes
          </h3>

          <form onSubmit={handleAddNote} className="space-y-2">
            <textarea
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add timestamped note for other back-office administrators..."
              className="w-full p-3 rounded-2xl bg-bg-soft border border-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingNote || !newNote.trim()}
                className="px-4 py-2 rounded-2xl bg-brand text-brand-contrast font-bold text-xs hover:opacity-90 disabled:opacity-40 transition-all shadow-luxury-sm"
              >
                {submittingNote ? 'Saving...' : 'Append Admin Note'}
              </button>
            </div>
          </form>

          <div className="space-y-2 pt-2 border-t border-border">
            {!user.adminNotes || user.adminNotes.length === 0 ? (
              <p className="text-xs text-text-muted">No internal notes appended yet.</p>
            ) : (
              user.adminNotes.map((note, index) => (
                <div key={index} className="p-3 rounded-2xl bg-bg-soft border border-border space-y-1 text-xs">
                  <p className="text-text-primary">{note.text}</p>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span>By {note.authorName || 'Admin'}</span>
                    <span>•</span>
                    <span>{new Date(note.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Audit Trail */}
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-4">
          <h3 className="font-editorial text-lg font-bold text-text-primary flex items-center gap-2">
            <Clock className="w-5 h-5 text-text-muted" /> Administrative Action Audit Trail
          </h3>
          {auditTrail.length === 0 ? (
            <p className="text-xs text-text-muted">No administrative modifications recorded for this user.</p>
          ) : (
            <div className="divide-y divide-border">
              {auditTrail.map((log) => (
                <div key={log._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-text-primary">{log.action}</span>
                    <p className="text-[11px] text-text-secondary">{log.reason || 'Admin action'}</p>
                  </div>
                  <div className="text-right text-[10px] text-text-muted">
                    <div>{log.actorEmail}</div>
                    <div>{new Date(log.createdAt).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trust Status Modal */}
      {trustModalOpen && (
        <Modal
          isOpen={trustModalOpen}
          onClose={() => setTrustModalOpen(false)}
          title={`Update Standing: ${targetStatus}`}
        >
          <form onSubmit={handleUpdateTrustStatus} className="space-y-4 text-xs">
            {statusError && <ErrorAlert error={statusError} onDismiss={() => setStatusError(null)} />}

            <p className="text-text-secondary leading-relaxed">
              Updating account standing to <strong>{targetStatus}</strong> alters platform access and permissions. A detailed reason is required for the audit log.
            </p>

            <div>
              <label className="font-bold text-text-primary block mb-1">Audit Reason (minimum 5 characters):</label>
              <textarea
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="E.g., High cancellation rate and unverified documents reported by host..."
                className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-text-primary"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTrustModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface border border-border font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingStatus}
                className="px-4 py-2 rounded-xl bg-brand text-brand-contrast font-bold text-xs hover:opacity-90 transition-all shadow-luxury-sm"
              >
                {submittingStatus ? 'Saving...' : 'Confirm Standing Update'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
