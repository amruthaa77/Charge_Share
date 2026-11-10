import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { SEO } from '../components/common/SEO';
import { Input } from '../components/common/Input';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { getErrorMessage } from '../utils/errorMapper';

export const ForgotPasswordPage = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorState, setErrorState] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorState(null);
    if (!email || !email.includes('@')) {
      setErrorState({
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success('Password reset instructions sent to your email.');
    } catch (err) {
      setErrorState(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-text-primary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="Forgot Password — ChargeShare Bengaluru"
        description="Reset your ChargeShare India account password. Receive a secure single-use link valid for 30 minutes."
        canonical="/forgot-password"
      />

      <div className="max-w-md w-full bg-surface border border-border rounded-4xl p-8 sm:p-10 shadow-luxury-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary mb-6 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
          <span>Back to Sign In</span>
        </Link>

        {submitted ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 rounded-full bg-brand/10 text-brand mx-auto flex items-center justify-center shadow-luxury-sm">
              <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
            </div>
            <h2 className="font-editorial text-2xl font-bold text-text-primary">
              Check Your Inbox
            </h2>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              If an account is associated with <strong>{email}</strong>, a secure 30-minute password reset link has been dispatched.
            </p>
            <div className="mt-6 flex flex-col gap-2 pt-2">
              <Link
                to="/login"
                className="w-full py-3 min-h-[44px] flex items-center justify-center rounded-2xl bg-brand hover:brightness-110 text-brand-contrast font-bold text-xs text-center shadow-luxury-sm transition-all"
              >
                Return to Sign In
              </Link>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs text-text-secondary hover:text-text-primary py-2 min-h-[44px] flex items-center justify-center"
              >
                Try another email
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 space-y-1">
              <h2 className="font-editorial text-3xl font-bold text-text-primary">
                Reset Password
              </h2>
              <p className="text-xs text-text-secondary">
                Enter your registered email address and we will dispatch a 30-minute password reset token.
              </p>
            </div>

            {errorState && (
              <ErrorAlert
                error={errorState}
                onDismiss={() => setErrorState(null)}
                className="mb-4"
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <Input
                id="reset-email"
                label="Registered Email Address:"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@example.com"
                icon={Mail}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 min-h-[44px] rounded-2xl bg-brand hover:brightness-110 text-brand-contrast font-bold text-xs transition-all shadow-luxury-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending Instructions...' : 'Send Reset Link'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
