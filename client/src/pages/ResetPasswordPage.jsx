import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Check, X, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/common/SEO';
import { Input } from '../components/common/Input';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { getErrorMessage } from '../utils/errorMapper';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login: setAuthSession } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorState, setErrorState] = useState(null);

  // Password rules validation
  const rules = [
    { label: 'Minimum 10 characters', met: password.length >= 10 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'At least one number (0-9)', met: /\d/.test(password) },
    { label: 'At least one symbol (!@#$%^&*)', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];

  const allRulesMet = rules.every((r) => r.met);
  const passwordsMatch = password && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorState(null);

    if (!token) {
      setErrorState({
        title: 'Missing Token',
        message: 'Password reset token is missing from URL.',
        action: { label: 'Request New Link', href: '/forgot-password' },
      });
      return;
    }

    if (!allRulesMet) {
      setErrorState({
        title: 'Weak Password',
        message: 'Please meet all password strength requirements listed below.',
      });
      return;
    }

    if (!passwordsMatch) {
      setErrorState({
        title: 'Passwords Mismatch',
        message: 'The two passwords entered do not match. Please verify.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/auth/reset-password', { token, password });
      if (res.data.user && res.data.token && typeof setAuthSession === 'function') {
        setAuthSession(res.data.user, res.data.token);
      }
      toast.success('Your password has been successfully reset.');
      navigate('/explore');
    } catch (err) {
      setErrorState(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-text-primary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="Set New Password — ChargeShare Bengaluru"
        description="Choose a new secure password for your ChargeShare India account."
        canonical="/reset-password"
      />

      <div className="max-w-md w-full bg-surface border border-border rounded-4xl p-8 sm:p-10 shadow-luxury-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary mb-6 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
          <span>Back to Sign In</span>
        </Link>

        <div className="mb-6 space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-3">
            <KeyRound className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="font-editorial text-3xl font-bold text-text-primary">
            Create New Password
          </h2>
          <p className="text-xs text-text-secondary">
            Ensure your new password meets Bengaluru community security standards.
          </p>
        </div>

        {!token ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
            No valid reset token was found in this link. Please request a new link from the{' '}
            <Link to="/forgot-password" className="font-bold underline text-rose-500">
              Forgot Password page
            </Link>
            .
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorState && (
              <ErrorAlert
                error={errorState}
                onDismiss={() => setErrorState(null)}
              />
            )}
            <Input
              id="new-pass"
              label="New Password:"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              icon={Lock}
              rightIcon={showPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowPassword((prev) => !prev)}
            />

            <Input
              id="confirm-pass"
              label="Confirm Password:"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              icon={Lock}
              rightIcon={showConfirmPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowConfirmPassword((prev) => !prev)}
              error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
            />

            {/* Checklist */}
            <div className="p-3 rounded-2xl bg-bg border border-border space-y-1">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                  {rule.met ? (
                    <Check className="w-3.5 h-3.5 text-brand shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  )}
                  <span className={rule.met ? 'text-brand font-semibold' : 'text-text-secondary'}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !allRulesMet || !passwordsMatch}
              className="w-full py-3.5 min-h-[44px] rounded-2xl bg-brand hover:brightness-110 text-brand-contrast font-bold text-xs transition-all shadow-luxury-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
