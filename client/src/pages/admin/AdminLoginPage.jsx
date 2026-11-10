import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { SEO } from '../../components/common/SEO';
import { Input } from '../../components/common/Input';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { getErrorMessage } from '../../utils/errorMapper';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Zap,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, adminUser, adminLogin, isAdminAuthenticated, adminAuthReady } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);

  // Progressive Lockout Countdown Timer
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const redirectUrl = searchParams.get('redirect') || '/admin';

  // Redirection Guard:
  // If already authenticated as an ADMIN, redirect to requested admin page or /admin.
  // Admin login is always reachable and does not redirect on rider/host sessions.
  useEffect(() => {
    if (adminAuthReady && isAdminAuthenticated && adminUser?.role === 'ADMIN') {
      navigate(redirectUrl, { replace: true });
    }
  }, [adminAuthReady, isAdminAuthenticated, adminUser, navigate, redirectUrl]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorState(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const formatLockoutTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (lockoutSeconds > 0) return;

    setLoading(true);
    setErrorState(null);

    try {
      const loggedInAdmin = await adminLogin(email.trim(), password.trim());
      toast.success(`Welcome, ${loggedInAdmin.name}. Back-office initialized.`);
      navigate(redirectUrl, { replace: true });
    } catch (err) {
      const mapped = getErrorMessage(err);

      // Handle account lockout with active countdown timer
      if (err.response?.status === 403 && err.response?.data?.code === 'ACCOUNT_LOCKED') {
        const waitMinutes = err.response.data.waitMinutes || 15;
        const totalSeconds = waitMinutes * 60;
        setLockoutSeconds(totalSeconds);
        setErrorState({
          ...mapped,
          message: `Too many failed attempts. Administrative access temporarily locked. Try again in ${formatLockoutTime(totalSeconds)}.`,
        });
      } else {
        setErrorState(mapped);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-bg text-text-primary flex flex-col justify-between selection:bg-brand/20 selection:text-brand transition-colors antialiased">
      <SEO
        title="Admin Sign In"
        description="ChargeShare India Back-Office and Safety Verification Portal."
        noindex={true}
      />

      {/* =========================================================================
          MINIMAL HEADER: Brand & Theme Toggle Only (No public nav or demo switcher)
          ========================================================================= */}
      <header className="h-16 px-4 sm:px-8 border-b border-border bg-nav-bg backdrop-blur-xl flex items-center justify-between transition-colors">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-text-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-brand rounded-xl p-1"
          title="ChargeShare Home"
        >
          <div className="w-9 h-9 rounded-xl bg-brand text-brand-contrast flex items-center justify-center shadow-luxury-sm">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="font-editorial text-base font-bold tracking-tight text-text-primary">
              ChargeShare
            </span>
            <span className="text-[10px] font-mono tracking-wider uppercase text-text-muted">
              Back-Office Portal
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="w-10 h-10 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors shadow-luxury-sm cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          LOGIN CONTAINER
          ========================================================================= */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-10">
        <div className="max-w-md w-full space-y-6 p-7 sm:p-10 rounded-3xl sm:rounded-4xl bg-surface border border-border shadow-luxury-lg backdrop-blur-md transition-colors">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center mx-auto shadow-luxury-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              Admin sign in
            </h1>
            <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
              Secure back-office authentication for platform administrators and safety inspectors.
            </p>
          </div>

          {/* Error / Lockout Banner */}
          {errorState && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-medium leading-relaxed">
                  {lockoutSeconds > 0
                    ? `Account locked due to consecutive failed attempts. Try again in ${formatLockoutTime(
                        lockoutSeconds
                      )}.`
                    : errorState.message || 'Invalid email or password.'}
                </p>
                {errorState.retryable && lockoutSeconds <= 0 && (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-200 underline hover:no-underline pt-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry sign in
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Notice for logged-in Non-Admin Users (Host / Rider) */}
          {isAuthenticated && user && user.role !== 'ADMIN' && (
            <div
              data-testid="signed-in-notice"
              className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="leading-relaxed">
                You are signed in as <span className="font-bold">{user.name}</span> ({user.role === 'HOST' ? 'Host' : 'Rider'}). Signing in as admin will sign you out of this account.
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
            <Input
              id="adminEmail"
              label="Admin Email:"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="admin@chargeshare.in"
              icon={Mail}
              className="text-base sm:text-xs"
              disabled={loading || lockoutSeconds > 0}
            />

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="adminPassword"
                  className="block text-xs font-semibold text-text-secondary tracking-wide"
                >
                  Password:
                </label>
                <span className="text-[11px] text-text-muted">Min 12 characters</span>
              </div>
              <Input
                id="adminPassword"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                icon={Lock}
                rightIcon={showPassword ? EyeOff : Eye}
                onRightIconClick={() => setShowPassword((prev) => !prev)}
                className="text-base sm:text-xs"
                disabled={loading || lockoutSeconds > 0}
              />
            </div>

            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0 || !email || !password}
              className="w-full py-3.5 px-4 min-h-[46px] rounded-2xl bg-brand hover:opacity-90 text-brand-contrast font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-luxury-sm disabled:opacity-50 disabled:cursor-not-allowed touch-target-min"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : lockoutSeconds > 0 ? (
                <span>Locked ({formatLockoutTime(lockoutSeconds)})</span>
              ) : (
                <>
                  <span>Sign in to Back-Office</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Non-discoverable Security Notice (No Register / No Forgot Password) */}
          <div className="pt-2 border-t border-border/60 text-center space-y-2">
            <p className="text-[11px] text-text-muted leading-relaxed">
              <strong className="text-text-secondary">Authorized personnel only.</strong> Public registration and
              self-service password resets are disabled for administrative accounts. Contact your platform owner for
              credential assistance.
            </p>
          </div>
        </div>
      </main>

      {/* =========================================================================
          MINIMAL FOOTER
          ========================================================================= */}
      <footer className="py-4 px-4 text-center border-t border-border text-[11px] text-text-muted">
        <span>© {new Date().getFullYear()} ChargeShare India • Dedicated Back-Office Portal</span>
      </footer>
    </div>
  );
};

export default AdminLoginPage;
