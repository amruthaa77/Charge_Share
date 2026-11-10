import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SEO } from '../components/common/SEO';
import { Input } from '../components/common/Input';
import { normalizeIndianPhone } from '../utils/phone';
import {
  Zap,
  User,
  Mail,
  Lock,
  Phone,
  AlertCircle,
  Check,
  X,
  Eye,
  EyeOff,
  RotateCw,
} from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { user, adminUser, isAdminAuthenticated, register, isAuthenticated, authReady } = useAuth();
  const { toast } = useToast();

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);

  // Redirect authenticated rider/host users away from /register
  useEffect(() => {
    if (authReady && isAuthenticated) {
      if (user?.role === 'HOST') navigate('/host/dashboard', { replace: true });
      else navigate('/explore', { replace: true });
    }
  }, [authReady, isAuthenticated, user, navigate]);

  const [role, setRole] = useState('EV_OWNER'); // 'EV_OWNER' or 'HOST'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [errorState, setErrorState] = useState(null);

  // Password rules validation
  const rules = [
    { label: 'At least 10 characters', met: password.length >= 10 },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'One number (0-9)', met: /\d/.test(password) },
    { label: 'One special symbol (!@#$%^&*)', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];
  const allRulesMet = rules.every((r) => r.met);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const errors = {};
    if (!name.trim()) errors.name = 'Full name is required';
    if (!email.trim() || !email.includes('@')) errors.email = 'Please enter a valid email address';
    if (!phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!normalizeIndianPhone(phone)) {
      errors.phone = 'Please enter a valid Indian mobile number (e.g. +91 98765 43210)';
    }
    if (!allRulesMet) {
      errors.password = 'Please ensure your password satisfies all security requirements.';
    }
    if (!consentGiven) {
      errors.consent = 'You must agree to the Terms of Service and Privacy Policy to register.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorState({
        message: 'Please resolve the highlighted issues below.',
        status: 400,
      });
      if (errors.name) nameRef.current?.focus();
      else if (errors.email) emailRef.current?.focus();
      else if (errors.phone) phoneRef.current?.focus();
      else if (errors.password) passwordRef.current?.focus();
      return;
    }

    setLoading(true);
    setErrorState(null);
    setFieldErrors({});

    try {
      const created = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizeIndianPhone(phone) || phone,
        password,
        role,
        city: 'Bengaluru',
      });

      toast.success('Welcome to ChargeShare India! Your account has been created.');
      if (created?.role === 'HOST') navigate('/become-a-host');
      else navigate('/explore');
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const responseErrors = data?.errors;
      const requestId = data?.requestId || err.response?.headers?.['x-request-id'];

      const newFieldErrors = {};

      if (responseErrors && Array.isArray(responseErrors)) {
        responseErrors.forEach((item) => {
          if (item.field) newFieldErrors[item.field] = item.message;
        });
      }

      if (status === 409) {
        const msg = data?.message || '';
        if (msg.toLowerCase().includes('email') || newFieldErrors.email) {
          newFieldErrors.email = newFieldErrors.email || msg || 'Email already registered.';
          emailRef.current?.focus();
        }
        if (msg.toLowerCase().includes('phone') || newFieldErrors.phone) {
          newFieldErrors.phone = newFieldErrors.phone || msg || 'Phone already registered.';
          phoneRef.current?.focus();
        }
        setFieldErrors(newFieldErrors);
        setErrorState({
          message: msg || 'An account with this email or phone already exists.',
          status: 409,
          isConflict: true,
        });
      } else if (status === 429) {
        setErrorState({
          message: 'Too many registration attempts from this network. Please try again after 15 minutes.',
          status: 429,
          isRateLimit: true,
        });
      } else if (!err.response) {
        setErrorState({
          message: 'Network connectivity error. Unable to reach ChargeShare servers.',
          status: 0,
          isNetworkError: true,
        });
      } else if (status >= 500) {
        setErrorState({
          message: 'Something went wrong on our side. Please try again.',
          status: 500,
          requestId,
        });
      } else {
        setFieldErrors(newFieldErrors);
        setErrorState({
          message: data?.message || 'Registration failed. Please check the form and try again.',
          status: status || 400,
        });
        if (newFieldErrors.name) nameRef.current?.focus();
        else if (newFieldErrors.email) emailRef.current?.focus();
        else if (newFieldErrors.phone) phoneRef.current?.focus();
        else if (newFieldErrors.password) passwordRef.current?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-80px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-bg text-text-primary transition-colors">
      <SEO
        title="Create an Account — ChargeShare Bengaluru"
        description="Join ChargeShare India. Discover verified 16A two-wheeler charging bays or monetize your socket in Bengaluru."
      />

      <div className="max-w-md w-full space-y-6 p-8 sm:p-10 rounded-4xl bg-surface border border-border shadow-luxury-md backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand text-brand-contrast flex items-center justify-center mx-auto shadow-luxury-sm">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <h1 className="font-editorial text-3xl font-bold text-text-primary">
            Join ChargeShare India
          </h1>
          <p className="text-xs text-text-secondary">
            Bengaluru&apos;s verified peer-to-peer EV two-wheeler charging grid.
          </p>
        </div>

        {/* Active Session Notice when Admin visits public register */}
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
                Creating an account will sign you out of the admin session.
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

        {/* Role Switcher Pill */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-bg-soft border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRole('EV_OWNER')}
            className={`py-2.5 min-h-[44px] flex items-center justify-center rounded-xl transition-all ${
              role === 'EV_OWNER' ? 'bg-brand text-brand-contrast shadow-luxury-sm font-bold' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            🛵 EV Scooter Rider
          </button>
          <button
            type="button"
            onClick={() => setRole('HOST')}
            className={`py-2.5 min-h-[44px] flex items-center justify-center rounded-xl transition-all ${
              role === 'HOST' ? 'bg-brand text-brand-contrast shadow-luxury-sm font-bold' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            🔌 16A Socket Host
          </button>
        </div>

        {/* Accessible Error Summary Banner */}
        {errorState && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errorState.message}</span>
              {errorState.isNetworkError && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold text-[11px] hover:bg-rose-600 transition-colors flex items-center gap-1 shrink-0"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
            </div>
            {errorState.isConflict && (
              <div className="pt-1 text-[11px] text-text-secondary border-t border-rose-500/10">
                Already have an account?{' '}
                <Link to="/login" className="text-brand font-bold underline hover:opacity-80">
                  Sign In here &rarr;
                </Link>
              </div>
            )}
            {errorState.requestId && (
              <div className="pt-1 text-[10px] text-text-muted font-mono border-t border-rose-500/10">
                Reference ID: {errorState.requestId}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <Input
            ref={nameRef}
            id="regName"
            label="Full Name:"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
            }}
            required
            placeholder="Ananya Sharma"
            icon={User}
            error={fieldErrors.name}
          />

          <Input
            ref={emailRef}
            id="regEmail"
            label="Email Address:"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
            }}
            required
            placeholder="ananya@example.com"
            icon={Mail}
            error={fieldErrors.email}
          />

          <Input
            ref={phoneRef}
            id="regPhone"
            label="Phone Number:"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
            }}
            required
            placeholder="+91 98765 43210"
            icon={Phone}
            error={fieldErrors.phone}
            helperText="Format: +91 98765 43210 or 10-digit mobile number"
          />

          <div>
            <Input
              ref={passwordRef}
              id="regPassword"
              label="Create Password:"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
              }}
              required
              placeholder="••••••••••••"
              icon={Lock}
              rightIcon={showPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowPassword((prev) => !prev)}
              error={fieldErrors.password}
            />

            {/* Password Security Rules */}
            <div className="mt-2.5 p-3 rounded-2xl bg-bg-soft border border-border space-y-1">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs">
                  {rule.met ? (
                    <Check className="w-3.5 h-3.5 text-brand shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  )}
                  <span className={rule.met ? 'text-text-primary font-semibold' : 'text-text-muted'}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer font-medium text-text-primary pt-1 text-xs">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => {
                  setConsentGiven(e.target.checked);
                  if (fieldErrors.consent) setFieldErrors((prev) => ({ ...prev, consent: '' }));
                }}
                className="rounded accent-emerald-600 w-4 h-4 mt-0.5"
              />
              <span className="leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" className="text-brand underline font-bold" target="_blank">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-brand underline font-bold" target="_blank">
                  Privacy Policy
                </Link>.
              </span>
            </label>
            {fieldErrors.consent && (
              <p className="text-[11px] text-danger font-medium">{fieldErrors.consent}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !allRulesMet || !consentGiven}
            className="w-full py-3.5 rounded-2xl bg-brand hover:opacity-90 text-brand-contrast font-bold text-xs transition-all shadow-luxury-sm disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <p className="text-center text-xs text-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-brand hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
