import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { authAPI } from '../services/api';
import { SEO } from '../components/common/SEO';
import { PageHeader } from '../components/common/PageHeader';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Smartphone,
  LogOut,
  Trash2,
  AlertTriangle,
  Moon,
  Sun,
  Bell,
  Check,
  X,
  MapPin,
} from 'lucide-react';

const INDIAN_PHONE_REGEX = /^(\+91[-\s]?)?[0]?(91)?[6789]\d{9}$/;
const NOTIF_PREFS_KEY = 'cs_notification_prefs';

export const SettingsPage = () => {
  const { user, isAuthenticated, authReady, logout, updateUserProfile, updateToken } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect unauthenticated visitors to login
  useEffect(() => {
    if (authReady && !isAuthenticated) {
      navigate('/login?redirect=/settings', { replace: true });
    }
  }, [authReady, isAuthenticated, navigate]);

  // Profile Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Active Sessions State
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(NOTIF_PREFS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return {
      bookingAlerts: true,
      emergencyAlerts: true,
      payoutAlerts: true,
    };
  });

  // Account Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Sync initial profile values
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Password strength rules
  const passwordRules = [
    { label: 'At least 10 characters', met: newPassword.length >= 10 },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
    { label: 'One number (0-9)', met: /\d/.test(newPassword) },
    { label: 'One special symbol (!@#$%^&*)', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) },
  ];
  const allPasswordRulesMet = passwordRules.every((r) => r.met);

  // 1. Profile Update Handler
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    let hasError = false;

    if (!name.trim() || name.trim().length < 2) {
      setNameError('Name must be at least 2 characters.');
      hasError = true;
    } else {
      setNameError('');
    }

    if (!phone.trim() || !INDIAN_PHONE_REGEX.test(phone.trim())) {
      setPhoneError('Please enter a valid Indian mobile number (e.g. +91 9876543210).');
      hasError = true;
    } else {
      setPhoneError('');
    }

    if (hasError) return;

    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
      });
      updateUserProfile(res.data.user);
      toast.success('Your profile details have been successfully updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // 2. Password Change Handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }

    if (!allPasswordRulesMet) {
      setPasswordError('New password must satisfy all 5 security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authAPI.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.data.token) {
        updateToken(res.data.token);
      }

      toast.success('Password changed successfully. All other device sessions have been invalidated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  // 3. Logout All Other Devices Handler
  const handleLogoutAllDevices = async () => {
    setLoggingOutAll(true);
    try {
      const res = await authAPI.logoutAllDevices();
      if (res.data.token) {
        updateToken(res.data.token);
      }
      toast.success('All other active device sessions have been terminated.');
      setShowLogoutAllConfirm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invalidate device sessions.');
    } finally {
      setLoggingOutAll(false);
    }
  };

  // 4. Toggle Notification Prefs
  const toggleNotifPref = (key) => {
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      toast.success('Notification preferences updated.');
      return updated;
    });
  };

  // 5. Account Deletion Handler
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteConfirmationText !== 'DELETE') {
      toast.error('You must type DELETE exactly to confirm account deletion.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await authAPI.deleteAccount({
        confirmationText: 'DELETE',
        reason: deleteReason,
      });

      toast.success(
        'Your account and personal data have been permanently deleted and anonymized under DPDP Act 2023.'
      );
      setShowDeleteModal(false);
      logout();
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user && !authReady) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] pb-24 bg-bg text-text-primary transition-colors">
      <SEO
        title="Account & Security Settings | ChargeShare India"
        description="Manage your profile, password credentials, active sessions, and DPDP Act rights on ChargeShare India."
      />

      <PageHeader
        category="Personal Account"
        title="Account & Security Settings"
        subtitle="Manage your personal profile, credentials, active sessions, and DPDP Act privacy rights"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* =========================================================================
            SECTION 1: PERSONAL PROFILE DETAILS
            ========================================================================= */}
        <section aria-labelledby="profile-heading" className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
              <User className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="profile-heading" className="text-lg font-bold font-editorial text-text-primary">
                Profile Details
              </h2>
              <p className="text-xs text-text-secondary">
                Your public name and contact phone for booking coordination.
              </p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="profileName"
                label="Full Legal Name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError('');
                }}
                error={nameError}
                required
                placeholder="Rohit Kulkarni"
              />

              <Input
                id="profilePhone"
                label="Primary Mobile Number"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError('');
                }}
                error={phoneError}
                required
                placeholder="+91 9876543210"
                helperText="Indian 10-digit mobile number with +91 country code"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-text-secondary tracking-wide mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    type="email"
                    readOnly
                    value={user.email}
                    disabled
                    className="w-full rounded-xl bg-bg-raised/50 border border-border text-sm text-text-muted pl-10 pr-3.5 py-2.5 cursor-not-allowed select-none opacity-80"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Email is locked for account security and KYC compliance.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary tracking-wide mb-1.5">
                  Operating City
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value="Bengaluru, Karnataka (Locked Geofence)"
                    disabled
                    className="w-full rounded-xl bg-bg-raised/50 border border-border text-sm text-text-muted pl-10 pr-3.5 py-2.5 cursor-not-allowed select-none opacity-80"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  All sockets and booking requests are restricted to Bengaluru.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 min-h-[44px] rounded-2xl bg-brand text-brand-contrast font-semibold text-xs hover:opacity-90 transition-all shadow-luxury-sm flex items-center gap-2 cursor-pointer touch-target-min"
              >
                {savingProfile ? (
                  <span>Saving Changes...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* =========================================================================
            SECTION 2: PASSWORD CREDENTIALS
            ========================================================================= */}
        <section aria-labelledby="password-heading" className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="password-heading" className="text-lg font-bold font-editorial text-text-primary">
                Change Password
              </h2>
              <p className="text-xs text-text-secondary">
                Update your account password. All other active device sessions will be invalidated.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && (
              <div role="alert" className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{passwordError}</span>
              </div>
            )}

            <div>
              <Input
                id="currentPassword"
                label="Current Password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter your existing password"
                rightIcon={showCurrentPassword ? EyeOff : Eye}
                onRightIconClick={() => setShowCurrentPassword((prev) => !prev)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  id="newPassword"
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Create a strong password"
                  rightIcon={showNewPassword ? EyeOff : Eye}
                  onRightIconClick={() => setShowNewPassword((prev) => !prev)}
                />
              </div>

              <div>
                <Input
                  id="confirmPassword"
                  label="Confirm New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-type new password"
                />
              </div>
            </div>

            {/* Live Password Rules Checklist */}
            {newPassword && (
              <div className="p-4 rounded-2xl bg-bg-raised/70 border border-border space-y-2">
                <span className="text-xs font-bold text-text-primary block">
                  Password Strength Requirements:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {passwordRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 text-xs transition-colors ${
                        rule.met ? 'text-brand font-semibold' : 'text-text-muted'
                      }`}
                    >
                      {rule.met ? (
                        <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden="true" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden="true" />
                      )}
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={savingPassword || !allPasswordRulesMet}
                className="px-6 py-2.5 min-h-[44px] rounded-2xl bg-brand text-brand-contrast font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition-all shadow-luxury-sm flex items-center gap-2 cursor-pointer touch-target-min"
              >
                {savingPassword ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" aria-hidden="true" />
                    <span>Update Password &amp; Revoke Other Sessions</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* =========================================================================
            SECTION 3: ACTIVE DEVICE SESSIONS
            ========================================================================= */}
        <section aria-labelledby="sessions-heading" className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="sessions-heading" className="text-lg font-bold font-editorial text-text-primary">
                Active Device Sessions
              </h2>
              <p className="text-xs text-text-secondary">
                Manage sessions across phones, laptops, and tablets.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-bg-raised/70 border border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
                <span className="text-xs font-bold text-text-primary">
                  Current Browser Session (Active Now)
                </span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Signed in from Bengaluru, Karnataka • JWT Authenticated
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutAllConfirm(true)}
              className="px-5 py-2.5 min-h-[44px] rounded-2xl bg-surface hover:bg-bg-elevated border border-border text-text-primary text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer touch-target-min shadow-luxury-sm"
            >
              <LogOut className="w-4 h-4 text-rose-500" aria-hidden="true" />
              <span>Log Out of All Devices</span>
            </button>
          </div>
        </section>

        {/* =========================================================================
            SECTION 4: APPEARANCE & THEME PREFERENCE
            ========================================================================= */}
        <section aria-labelledby="appearance-heading" className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
              {isDark ? (
                <Moon className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Sun className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 id="appearance-heading" className="text-lg font-bold font-editorial text-text-primary">
                Appearance &amp; Theme
              </h2>
              <p className="text-xs text-text-secondary">
                Switch between high-contrast Dark Emerald and Clean Mint light themes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                if (!isDark) toggleTheme();
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                isDark
                  ? 'border-brand bg-brand/10 shadow-luxury-sm'
                  : 'border-border bg-bg-raised hover:border-brand/40'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-brand">
                <Moon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">Dark Theme</span>
                  {isDark && <Check className="w-4 h-4 text-brand" />}
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Deep forest green surfaces &amp; glowing emerald accents
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isDark) toggleTheme();
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                !isDark
                  ? 'border-brand bg-brand/10 shadow-luxury-sm'
                  : 'border-border bg-bg-raised hover:border-brand/40'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-amber-500">
                <Sun className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">Light Theme</span>
                  {!isDark && <Check className="w-4 h-4 text-brand" />}
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Crisp mint surfaces &amp; high-contrast slate typography
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* =========================================================================
            SECTION 5: NOTIFICATION PREFERENCES
            ========================================================================= */}
        <section aria-labelledby="notifications-heading" className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="notifications-heading" className="text-lg font-bold font-editorial text-text-primary">
                Notification Preferences
              </h2>
              <p className="text-xs text-text-secondary">
                Configure real-time alerts for booking confirmations, SOS navigation, and host payouts.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-start justify-between p-3.5 rounded-2xl bg-bg-raised/70 border border-border cursor-pointer">
              <div className="pr-4">
                <span className="text-xs font-bold text-text-primary block">
                  Booking Holds &amp; QR Pass Confirmations
                </span>
                <span className="text-[11px] text-text-secondary">
                  Receive 10-minute hold countdown reminders and host access instructions.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.bookingAlerts}
                onChange={() => toggleNotifPref('bookingAlerts')}
                className="mt-1 w-4 h-4 rounded accent-brand cursor-pointer"
              />
            </label>

            <label className="flex items-start justify-between p-3.5 rounded-2xl bg-bg-raised/70 border border-border cursor-pointer">
              <div className="pr-4">
                <span className="text-xs font-bold text-text-primary block">
                  Emergency SOS Bay Priority Alerts
                </span>
                <span className="text-[11px] text-text-secondary">
                  Instant notifications when low battery triggers high-priority socket navigation.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.emergencyAlerts}
                onChange={() => toggleNotifPref('emergencyAlerts')}
                className="mt-1 w-4 h-4 rounded accent-brand cursor-pointer"
              />
            </label>

            <label className="flex items-start justify-between p-3.5 rounded-2xl bg-bg-raised/70 border border-border cursor-pointer">
              <div className="pr-4">
                <span className="text-xs font-bold text-text-primary block">
                  Host Direct Deposit Payout Receipts
                </span>
                <span className="text-[11px] text-text-secondary">
                  Weekly bank settlement summaries and rider cancellation compensations.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.payoutAlerts}
                onChange={() => toggleNotifPref('payoutAlerts')}
                className="mt-1 w-4 h-4 rounded accent-brand cursor-pointer"
              />
            </label>
          </div>
        </section>

        {/* =========================================================================
            SECTION 6: DPDP ACT 2023 DATA ERASURE & ACCOUNT DELETION
            ========================================================================= */}
        <section aria-labelledby="danger-heading" className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 shadow-luxury-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-rose-500/20 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 id="danger-heading" className="text-lg font-bold font-editorial">
                DPDP Act 2023 Data Erasure (Right to Be Forgotten)
              </h2>
              <p className="text-xs opacity-90">
                Permanently delete your profile and anonymize all legal records.
              </p>
            </div>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            In accordance with India’s Digital Personal Data Protection (DPDP) Act 2023, you have the right to erase your personal account. Executing this will permanently anonymize your name, phone number, and email, cancel all active and upcoming bookings with policy-compliant refunds, and delist all host sockets.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2.5 min-h-[44px] rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-luxury-sm flex items-center gap-2 cursor-pointer touch-target-min"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>Delete Account &amp; Anonymize Data</span>
            </button>
          </div>
        </section>
      </main>

      {/* =========================================================================
          CONFIRMATION MODAL: LOG OUT ALL DEVICES
          ========================================================================= */}
      <Modal
        isOpen={showLogoutAllConfirm}
        onClose={() => setShowLogoutAllConfirm(false)}
        title="Log Out of All Devices"
        subtitle="Invalidate authentication tokens across every browser"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-text-secondary leading-relaxed">
            Are you sure you want to revoke all active device sessions? Any tablet, phone, or other computer currently signed into this account will be logged out immediately.
          </p>
          <div className="p-3 rounded-xl bg-bg-raised border border-border text-[11px] text-text-muted">
            ℹ️ You will remain securely signed in on this current browser device.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowLogoutAllConfirm(false)}
              className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-text-secondary hover:bg-bg-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loggingOutAll}
              onClick={handleLogoutAllDevices}
              className="px-5 py-2 min-h-[44px] rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-1.5"
            >
              {loggingOutAll ? 'Revoking Sessions...' : 'Confirm Session Invalidation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          CONFIRMATION MODAL: DPDP ACT ACCOUNT DELETION
          ========================================================================= */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmationText('');
        }}
        title="Confirm Permanent Deletion"
        subtitle="This action is irreversible under Indian Data Protection Law"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-1">
            <p className="font-bold">Permanent Consequences:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              <li>Personal identifiers (name, email, phone) permanently anonymized.</li>
              <li>Upcoming reservations cancelled with policy refunds.</li>
              <li>Host sockets removed from Bengaluru directory.</li>
              <li>All authentication tokens revoked.</li>
            </ul>
          </div>

          <div>
            <label htmlFor="confirmDeleteInput" className="block text-xs font-bold text-text-primary mb-1">
              Type &ldquo;DELETE&rdquo; to confirm *
            </label>
            <input
              id="confirmDeleteInput"
              type="text"
              required
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="DELETE"
              className="w-full p-2.5 rounded-xl border border-rose-500/50 bg-input-bg text-input-text text-xs font-mono tracking-widest focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="deleteReasonInput" className="block text-xs font-semibold text-text-secondary mb-1">
              Reason for leaving (Optional)
            </label>
            <input
              id="deleteReasonInput"
              type="text"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. Relocating away from Bengaluru..."
              className="w-full p-2.5 rounded-xl border border-border bg-input-bg text-input-text text-xs focus:ring-2 focus:ring-brand focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmationText('');
              }}
              className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-text-secondary hover:bg-bg-elevated cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleteConfirmationText !== 'DELETE' || isDeletingAccount}
              className="px-5 py-2 min-h-[44px] rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer touch-target-min"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeletingAccount ? 'Deleting Records...' : 'Confirm Account Erasure'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
