import React from 'react';
import { Cookie, Settings, ShieldCheck } from 'lucide-react';
import { SEO } from '../components/common/SEO';

export const CookiePolicyPage = () => {
  const handleOpenSettings = () => {
    window.dispatchEvent(new Event('open-cookie-settings'));
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-text-primary py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="Cookie Policy & Storage Preferences — ChargeShare Bengaluru"
        description="ChargeShare India Cookie Policy. Learn how we utilize cookies and local tokens to secure EV charging transactions and persist map settings."
        canonical="/cookies"
      />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold border border-brand/20">
            <Cookie className="w-3.5 h-3.5 text-brand" />
            <span>Cookie Settings</span>
          </div>
          <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-text-primary tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-xs text-text-secondary">
            How ChargeShare India protects your data and manages session tokens in Bengaluru
          </p>
        </div>

        {/* Disclaimer Banner */}
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-xs text-text-primary leading-relaxed shadow-luxury-sm">
          <strong className="text-amber-500">Notice:</strong> This policy text is a template provided for platform demonstration and portfolio purposes and does not constitute formal legal advice.
        </div>

        {/* Action Callout */}
        <div className="p-6 sm:p-8 rounded-4xl bg-surface border border-border shadow-luxury-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-editorial text-lg font-bold text-text-primary flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand" />
              <span>Manage Your Storage Preferences</span>
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              You can adjust which cookie categories are allowed on your device at any moment.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenSettings}
            className="px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand hover:brightness-110 text-brand-contrast font-bold text-xs flex items-center gap-2 shadow-luxury-sm shrink-0 touch-target-min"
          >
            <Settings className="w-4 h-4" />
            <span>Open Cookie Manager</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="bg-surface border border-border rounded-4xl p-8 sm:p-12 shadow-luxury-sm space-y-8 text-xs text-text-secondary leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              1. Strictly Necessary Tokens
            </h3>
            <p>
              These tokens are essential to authenticate your identity, enforce CSRF protection, and securely maintain your 10-minute slot reservation locks. They cannot be deactivated without terminating platform functionality.
            </p>
          </section>

          <section className="space-y-2 pt-6 border-t border-border">
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              2. Functional & Map Cache Tokens
            </h3>
            <p>
              These tokens store your preferred dark/light theme, selected vehicle filter presets (e.g. Ather 450X), and the most recently explored Bengaluru tech corridors (e.g. Indiranagar or Whitefield) to reduce redundant network transfers.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
