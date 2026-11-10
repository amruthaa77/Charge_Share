import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const RiderHostGuard = ({ children, flowName = 'rider or host' }) => {
  const { user, adminUser, isAdmin, authReady, adminAuthReady } = useAuth();
  const ready = authReady && adminAuthReady;

  if (ready && (isAdmin || user?.role === 'ADMIN' || adminUser?.role === 'ADMIN')) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-surface border border-border shadow-luxury-md text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="font-editorial text-xl font-bold text-text-primary">Admin Account Restriction</h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Admin accounts cannot perform rider or host actions ({flowName}). Platform administrators manage operations via the back-office console. To experience this flow, use a dedicated rider or host account.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/admin"
              className="px-4 py-2.5 rounded-2xl bg-brand text-brand-contrast text-xs font-bold hover:opacity-90 shadow-luxury-sm"
            >
              Go to Admin Console
            </Link>
            <Link
              to="/login"
              className="px-4 py-2.5 rounded-2xl bg-bg-soft border border-border text-text-primary text-xs font-semibold hover:bg-bg-elevated"
            >
              Sign in as Rider / Host
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};
