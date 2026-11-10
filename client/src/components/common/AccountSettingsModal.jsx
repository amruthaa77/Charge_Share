import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Modal } from './Modal';
import {
  User,
  ShieldCheck,
  Smartphone,
  LogOut,
  Trash2,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export const AccountSettingsModal = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogoutAllDevices = async () => {
    try {
      setIsLoggingOutAll(true);
      await api.post('/auth/logout-all');
      toast.success('All active sessions across all devices have been logged out.');
      onClose();
      logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke device sessions.');
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteConfirmationText !== 'DELETE') {
      toast.error('You must type DELETE exactly to confirm account deletion.');
      return;
    }

    try {
      setIsDeleting(true);
      await api.post('/auth/delete-account', {
        confirmationText: 'DELETE',
        reason: deleteReason,
      });

      toast.success(
        'Your account and personal data have been permanently deleted and anonymized under DPDP Act 2023.'
      );
      setShowDeleteConfirm(false);
      onClose();
      logout();
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process account deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Modal
        isOpen={isOpen && !showDeleteConfirm}
        onClose={onClose}
        title="Account & Privacy Settings"
        subtitle="Manage your profile, active sessions, and DPDP Act rights"
        maxWidth="max-w-md"
      >
        <div className="space-y-5">
          {/* Profile Overview */}
          <div className="p-4 rounded-2xl bg-bg-elevated border border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand text-brand-contrast font-bold flex items-center justify-center text-base shadow-luxury-sm">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-text-primary truncate">
                  {user.name}
                </h4>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                    {user.role}
                  </span>
                  {user.isVerifiedHost && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand flex items-center gap-1 border border-brand/20">
                      <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                      Verified Host
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border text-xs text-text-secondary space-y-1">
              <p className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
                <span>Mobile: {user.phone || '+91 9876543210'}</span>
              </p>
              <p className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
                <span>Operating City: Bengaluru, Karnataka</span>
              </p>
            </div>
          </div>

          {/* Session Revocation */}
          <div className="p-4 rounded-2xl border border-border bg-surface space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand" aria-hidden="true" />
              <h4 className="text-xs font-bold text-text-primary">Active Device Sessions</h4>
            </div>
            <p className="text-[11px] text-text-muted">
              Suspicious activity or lost your device? Invalidate all active authentication tokens across every mobile and desktop browser immediately.
            </p>
            <button
              type="button"
              disabled={isLoggingOutAll}
              onClick={handleLogoutAllDevices}
              className="mt-1 w-full py-2 px-3 rounded-xl border border-border hover:bg-bg-elevated text-xs font-semibold text-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-target-min"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isLoggingOutAll ? 'Revoking Sessions...' : 'Log Out of All Devices'}</span>
            </button>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 space-y-2">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              <h4 className="text-xs font-bold">DPDP Act 2023 Data Erasure (Right to Be Forgotten)</h4>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Permanently delete your account. Anonymizes your legal name, mobile number, and email. Cancels upcoming bookings with policy refunds and unlists all host charging sockets.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-1 w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-target-min"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Delete Account &amp; Anonymize Data</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Strict "Type DELETE" Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmationText('');
        }}
        title="Confirm Permanent Deletion"
        subtitle="This action is irreversible under Indian Data Protection Law"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 space-y-1">
            <p className="font-bold">By proceeding, the following will occur:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              <li>Your personal identifiers will be permanently anonymized.</li>
              <li>Upcoming reservations will be cancelled and refunded according to policy.</li>
              <li>If you are a host, your listed sockets will be removed from Bengaluru search.</li>
              <li>All active session cookies and tokens will be permanently revoked.</li>
            </ul>
          </div>

          <div>
            <label htmlFor="delete-confirm" className="block text-xs font-bold text-text-primary mb-1">
              Type &ldquo;DELETE&rdquo; to confirm *
            </label>
            <input
              id="delete-confirm"
              type="text"
              required
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="DELETE"
              className="w-full p-2.5 rounded-xl border border-rose-500/50 bg-input-bg text-input-text text-xs font-mono tracking-widest focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="delete-reason" className="block text-xs font-semibold text-text-primary mb-1">
              Reason for leaving (Optional)
            </label>
            <input
              id="delete-reason"
              type="text"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. Relocating away from Bengaluru..."
              className="w-full p-2.5 rounded-xl border border-border bg-input-bg text-input-text text-xs focus:ring-2 focus:ring-brand focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmationText('');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-bg-elevated cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleteConfirmationText !== 'DELETE' || isDeleting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white shadow-sm flex items-center gap-1.5 cursor-pointer touch-target-min"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isDeleting ? 'Deleting Data...' : 'Confirm Account Erasure'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
