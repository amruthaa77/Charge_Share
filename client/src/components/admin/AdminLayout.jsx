import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { adminAPI } from '../../services/api';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { ErrorAlert } from '../common/ErrorAlert';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Zap,
  Calendar,
  CreditCard,
  Flag,
  Mail,
  FileText,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  LogOut,
  Settings,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AdminLayout = ({ children }) => {
  const {
    adminUser,
    isAdminAuthenticated,
    adminAuthReady,
    adminLogout,
    updateAdminProfile,
    updateAdminToken,
    user,
    isAuthenticated,
    authReady,
    logout,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const currentAdmin = adminUser || (user?.role === 'ADMIN' ? user : null);
  const isReady = adminAuthReady !== undefined ? adminAuthReady : authReady;
  const isAuthed = isAdminAuthenticated || (user?.role === 'ADMIN' && isAuthenticated);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Dynamic notification & badge counts
  const [badgeCounts, setBadgeCounts] = useState({
    pendingKYC: 0,
    openReports: 0,
  });

  // Forced password change modal
  const [forcedPasswordModal, setForcedPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showForcedPassword, setShowForcedPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Check mustChangePassword on admin
  useEffect(() => {
    if (isReady && isAuthed && currentAdmin?.role === 'ADMIN' && (currentAdmin?.mustChangePassword || currentAdmin?.must_change_password)) {
      setForcedPasswordModal(true);
    } else {
      setForcedPasswordModal(false);
    }
  }, [isReady, isAuthed, currentAdmin]);

  // Load live admin badge counts
  useEffect(() => {
    if (isReady && isAuthed && currentAdmin?.role === 'ADMIN') {
      const loadCounts = async () => {
        try {
          const res = await adminAPI.getStats();
          if (res.data?.stats) {
            setBadgeCounts({
              pendingKYC: res.data.stats.verifications?.pending || 0,
              openReports: res.data.stats.reports?.open || 0,
            });
          }
        } catch {
          // ignore quiet network fetch
        }
      };
      loadCounts();
      const interval = setInterval(loadCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [isReady, isAuthed, currentAdmin]);

  // Close menus on route navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
    setUserMenuOpen(false);
    setNotifDropdownOpen(false);
  }, [location.pathname]);

  // Navigation Items
  const navItems = [
    {
      name: 'Overview',
      path: '/admin',
      exact: true,
      icon: LayoutDashboard,
    },
    {
      name: 'KYC Verifications',
      path: '/admin/kyc',
      icon: ShieldCheck,
      badge: badgeCounts.pendingKYC,
      badgeColor: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    },
    {
      name: 'Users & Legitimacy',
      path: '/admin/users',
      icon: Users,
    },
    {
      name: 'Hosts & Listings',
      path: '/admin/listings',
      icon: Zap,
    },
    {
      name: 'Bookings',
      path: '/admin/bookings',
      icon: Calendar,
    },
    {
      name: 'Payments & Refunds',
      path: '/admin/payments',
      icon: CreditCard,
    },
    {
      name: 'Reports & Disputes',
      path: '/admin/reports',
      icon: Flag,
      badge: badgeCounts.openReports,
      badgeColor: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
    },
    {
      name: 'Messages',
      path: '/admin/messages',
      icon: Mail,
    },
    {
      name: 'Audit Log',
      path: '/admin/audit',
      icon: FileText,
    },
  ];

  const isItemActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  // Forced password submission
  const handleForcedPasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(null);

    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (trimmedPassword.length < 12) {
      setPasswordError('Password must be at least 12 characters long.');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      setPasswordSubmitting(true);
      const res = await adminAPI.changeForcedPassword({ newPassword: trimmedPassword });
      if (res.data?.token || res.data?.admin_session) {
        updateAdminToken?.(res.data.token || res.data.admin_session);
      }
      updateAdminProfile?.({ mustChangePassword: false, must_change_password: false });
      toast.success('Admin password updated successfully. Back-office unlocked.');
      setForcedPasswordModal(false);
      navigate('/admin', { replace: true });
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setPasswordError('Your admin session has expired. Sign in to the back-office again.');
      } else {
        setPasswordError(
          err.response?.data?.message || err.response?.data?.error || 'Failed to update administrator password.'
        );
      }
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // Guard: Loading State
  if (!isReady) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-bg text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-text-secondary">Verifying back-office credentials...</span>
        </div>
      </div>
    );
  }

  // Guard: Unauthorized (Logged-in non-admin rider/host -> 403 Forbidden Screen)
  if ((user && user.role !== 'ADMIN') || (currentAdmin && currentAdmin.role !== 'ADMIN')) {
    const signedInName = user?.name || currentAdmin?.name || 'User';
    const signedInRole = (user?.role || currentAdmin?.role) === 'HOST' ? 'Host' : 'Rider';

    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4 bg-bg text-text-primary">
        <div className="max-w-md w-full p-8 rounded-3xl bg-surface border border-border shadow-luxury-lg text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="font-editorial text-2xl font-bold text-text-primary">Access Restricted (403)</h1>
            <p className="text-xs text-text-secondary leading-relaxed">
              The ChargeShare back-office and safety verification portal is restricted to authorized platform administrators only.
            </p>
            <div className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold bg-bg-soft border border-border text-text-secondary">
              Signed in as <span className="font-bold text-text-primary">{signedInName}</span>, {signedInRole}
            </div>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-brand text-brand-contrast font-bold text-xs hover:opacity-90 transition-all shadow-luxury-sm"
            >
              Sign in as admin
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/admin/login', { replace: true });
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-xs hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
            <Link
              to="/explore"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-bg-soft border border-border text-text-primary font-bold text-xs hover:bg-bg-elevated transition-all"
            >
              Return to ChargeShare Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Guard: Unauthenticated -> Redirect to Dedicated Admin Login
  if (!isAuthed || !currentAdmin || currentAdmin.role !== 'ADMIN') {
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-bg text-text-primary flex flex-col antialiased transition-colors">
      {/* =========================================================================
          TOP ADMIN APP BAR
          ========================================================================= */}
      <header className="sticky top-0 z-40 h-16 bg-nav-bg backdrop-blur-xl border-b border-nav-border flex items-center justify-between px-4 sm:px-6 transition-colors shadow-luxury-sm">
        <div className="flex items-center gap-3">
          {/* Mobile drawer toggle */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            aria-label="Open administration menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Admin Brand Lockup */}
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="font-editorial text-lg font-bold tracking-tight text-text-primary leading-none">
                Charge<span className="text-brand">Share</span>
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-wider uppercase mt-0.5">
                Back-Office Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Top Right Utilities */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Admin Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifDropdownOpen((prev) => !prev)}
              className="p-2.5 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors relative"
              aria-label="Admin Alerts"
            >
              <Bell className="w-4 h-4" />
              {(badgeCounts.pendingKYC > 0 || badgeCounts.openReports > 0) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {badgeCounts.pendingKYC + badgeCounts.openReports}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-surface border border-border shadow-luxury-xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Back-Office Alerts</span>
                  <span className="text-[10px] text-text-muted">Live Queue</span>
                </div>
                <div className="space-y-2">
                  <Link
                    to="/admin/kyc"
                    onClick={() => setNotifDropdownOpen(false)}
                    className="p-2.5 rounded-xl bg-bg-soft hover:bg-bg-elevated border border-border flex items-center justify-between transition-colors text-xs"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <ShieldCheck className="w-4 h-4 text-amber-500" /> Pending KYC Audits
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{badgeCounts.pendingKYC}</span>
                  </Link>

                  <Link
                    to="/admin/reports"
                    onClick={() => setNotifDropdownOpen(false)}
                    className="p-2.5 rounded-xl bg-bg-soft hover:bg-bg-elevated border border-border flex items-center justify-between transition-colors text-xs"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Flag className="w-4 h-4 text-rose-500" /> Open Defect Reports
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{badgeCounts.openReports}</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              id="user-menu-button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1.5 pl-2.5 rounded-2xl bg-surface border border-border hover:bg-bg-elevated transition-colors"
              aria-label="Administrator Menu"
            >
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="hidden sm:inline text-xs font-bold text-text-primary max-w-[120px] truncate">
                {user?.name || 'Admin'}
              </span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-surface border border-border shadow-luxury-xl p-2 z-50 text-xs space-y-1">
                <div className="p-2 border-b border-border">
                  <div className="font-bold text-text-primary truncate">{currentAdmin?.name || 'Administrator'}</div>
                  <div className="text-[11px] text-text-secondary truncate">{currentAdmin?.email || 'admin@chargeshare.in'}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Administrator
                  </span>
                </div>

                <Link
                  to="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  <Settings className="w-4 h-4 text-text-secondary" /> Account Settings
                </Link>

                <a
                  href="/explore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-brand" /> View Public Site
                </a>

                <button
                  type="button"
                  onClick={async () => {
                    setUserMenuOpen(false);
                    await (adminLogout || logout)();
                    navigate('/admin/login', { replace: true });
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          BODY: COLLAPSIBLE SIDEBAR + MAIN CONTENT AREA
          ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`hidden lg:flex flex-col border-r border-border bg-surface transition-all duration-300 z-30 shrink-0 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <div className="p-3 border-b border-border flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-2">
                Back-Office Navigation
              </span>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors mx-auto"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between p-2.5 rounded-2xl text-xs font-semibold transition-all group ${
                    active
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/25 shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        active ? 'text-amber-500' : 'text-text-muted group-hover:text-text-primary'
                      }`}
                    />
                    {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {!sidebarCollapsed && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor || 'bg-bg-elevated text-text-primary'}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* MOBILE DRAWER */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Slide-out drawer */}
            <div className="relative w-72 max-w-[85vw] bg-surface h-full shadow-2xl flex flex-col z-10 border-r border-border">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <span className="font-editorial text-base font-bold text-text-primary">Admin Console</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-2xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/25'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${active ? 'text-amber-500' : 'text-text-muted'}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-border">
                <a
                  href="/explore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-bg-soft hover:bg-bg-elevated border border-border text-xs font-bold text-text-primary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-brand" /> View Public Site
                </a>
              </div>
            </div>
          </div>
        )}

        {/* MAIN OUTLET / CHILDREN CONTENT */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {children || <Outlet />}
        </main>
      </div>

      {/* =========================================================================
          FORCED INITIAL PASSWORD ROTATION MODAL (Step 6)
          ========================================================================= */}
      {forcedPasswordModal && (
        <Modal
          isOpen={forcedPasswordModal}
          onClose={() => {}} // Inescapable until updated
          title="Initial Password Rotation Required"
          hideClose
        >
          <form onSubmit={handleForcedPasswordSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4" /> Security Compliance Policy
              </span>
              <p className="text-[11px] leading-relaxed">
                This administrator account was created with a temporary password. You must set a strong custom password of at least 12 characters to unlock the back-office.
              </p>
            </div>

            {passwordError && (
              <ErrorAlert
                error={{ message: passwordError, title: 'Password Validation Failed' }}
                onDismiss={() => setPasswordError(null)}
              />
            )}

            <Input
              label="New Administrator Password"
              type={showForcedPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 12 characters"
              required
              rightIcon={showForcedPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowForcedPassword((prev) => !prev)}
              helperText="Must contain uppercase, lowercase, numbers, and symbols"
            />

            <Input
              label="Confirm New Password"
              type={showForcedPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              required
              rightIcon={showForcedPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowForcedPassword((prev) => !prev)}
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordSubmitting}
                className="w-full py-3 rounded-2xl bg-brand text-brand-contrast font-bold text-xs hover:opacity-90 transition-all shadow-luxury-sm disabled:opacity-50"
              >
                {passwordSubmitting ? 'Updating Password...' : 'Save Password & Unlock Back-Office'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
