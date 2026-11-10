import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SEO } from '../components/common/SEO';
import { Input } from '../components/common/Input';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { getErrorMessage } from '../utils/errorMapper';
import { api } from '../services/api';
import { Zap, Lock, Mail, AlertCircle, Sparkles, Bike, Eye, EyeOff } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, adminUser, isAdminAuthenticated, login, quickDemoLogin, logout, isAuthenticated, authReady } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);

  const from = searchParams.get('redirect') || location.state?.from?.pathname || '/explore';
  const isDemoMode =
    import.meta.env.VITE_DEMO_MODE !== 'false' &&
    (import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true');

  // Redirect authenticated users away from /login unless switching accounts or admin signing into rider/host
  useEffect(() => {
    if (authReady && isAuthenticated) {
      if (user?.role === 'ADMIN' || searchParams.get('switch') === 'true') {
        return;
      }
      if (user?.role === 'HOST') navigate('/host/dashboard', { replace: true });
      else navigate(from, { replace: true });
    }
  }, [authReady, isAuthenticated, user, navigate, from, searchParams]);

  useEffect(() => {
    const verifyToken = searchParams.get('verifyToken');
    if (verifyToken) {
      api
        .post('/auth/verify-email', { token: verifyToken })
        .then(() => {
          toast.success('Your email address has been successfully verified! Please sign in.');
        })
        .catch((err) => {
          const parsed = getErrorMessage(err);
          toast.error(parsed.message);
        });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorState(null);
    try {
      const loggedIn = await login(email, password);
      toast.success(`Welcome back, ${loggedIn.name}!`);
      if (loggedIn.role === 'ADMIN') navigate('/admin');
      else if (loggedIn.role === 'HOST') navigate('/host/dashboard');
      else navigate(from);
    } catch (err) {
      setErrorState(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role) => {
    setLoading(true);
    setErrorState(null);
    try {
      await quickDemoLogin(role);
      toast.success(`Logged in with demo ${role} account`);
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'HOST') navigate('/host/dashboard');
      else navigate('/explore');
    } catch (err) {
      setErrorState(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-80px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-bg text-text-primary transition-colors">
      <SEO
        title="Sign In — ChargeShare Bengaluru"
        description="Sign in to ChargeShare India. Manage your EV two-wheeler garage, charging passes, and host socket payouts."
      />

      <div className="max-w-md w-full space-y-6 p-8 sm:p-10 rounded-4xl bg-surface border border-border shadow-luxury-md backdrop-blur-md">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand text-brand-contrast flex items-center justify-center mx-auto shadow-luxury-sm">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <h1 className="font-editorial text-3xl font-bold text-text-primary">
            Sign In to ChargeShare
          </h1>
          <p className="text-xs text-text-secondary">
            Access your electric two-wheeler garage and digital booking passes.
          </p>
        </div>

        {/* Active Session Notice when Admin visits public login */}
        {(isAdminAuthenticated || user?.role === 'ADMIN') && (
          <div
            data-testid="admin-signed-in-notice"
            className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3 shadow-luxury-sm"
          >
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-amber-800 dark:text-amber-200 block">
                You are signed in as Admin.
              </span>
              <span className="text-[11px] text-text-secondary block">
                Signing in as another user will sign you out of the admin session.
              </span>
            </div>
            <Link
              to="/admin"
              className="text-[11px] font-semibold text-brand underline hover:no-underline shrink-0"
            >
              Back to Admin
            </Link>
          </div>
        )}

        {isAuthenticated && user?.role !== 'ADMIN' && (
          <div className="p-3.5 rounded-2xl bg-brand/10 border border-brand/20 text-xs flex items-center justify-between gap-3 shadow-luxury-sm">
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-text-primary block truncate">
                Signed in as {user.name} ({user.role === 'HOST' ? 'Host' : 'Rider'})
              </span>
              <span className="text-[11px] text-text-secondary block">
                Sign in with other credentials to switch accounts.
              </span>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="text-[11px] font-semibold text-brand underline hover:no-underline shrink-0"
            >
              Sign out
            </button>
          </div>
        )}

        {/* 1-Click Instant Demo Login Strip */}
        {isDemoMode && (
          <div className="p-4 rounded-2xl bg-bg-soft border border-border space-y-2.5">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-brand uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>1-Click Demo Personas</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemo('EV_OWNER')}
                className="py-2.5 px-2 min-h-[44px] flex items-center justify-center rounded-xl bg-surface hover:bg-bg-elevated text-text-primary text-xs font-bold border border-border transition-colors shadow-luxury-sm text-center"
              >
                🛵 Rider
              </button>
              <button
                type="button"
                onClick={() => handleDemo('HOST')}
                className="py-2.5 px-2 min-h-[44px] flex items-center justify-center rounded-xl bg-surface hover:bg-bg-elevated text-text-primary text-xs font-bold border border-border transition-colors shadow-luxury-sm text-center"
              >
                🔌 Host
              </button>
            </div>
          </div>
        )}

        {errorState && (
          <ErrorAlert
            error={errorState}
            onDismiss={() => setErrorState(null)}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <Input
            id="loginEmail"
            label="Email Address:"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="rider@example.com"
            icon={Mail}
          />

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="loginPassword" className="block text-xs font-semibold text-text-secondary tracking-wide">
                Password:
              </label>
              <Link to="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="loginPassword"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••••"
              icon={Lock}
              rightIcon={showPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowPassword((prev) => !prev)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-brand hover:opacity-90 text-brand-contrast font-bold text-xs transition-all shadow-luxury-sm disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-text-secondary">
          Don&apos;t have an account yet?{' '}
          <Link to="/register" className="font-bold text-brand hover:underline">
            Register for free
          </Link>
        </p>
      </div>
    </div>
  );
};
