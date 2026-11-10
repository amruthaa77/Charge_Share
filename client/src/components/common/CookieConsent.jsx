import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie, Settings2, Check } from 'lucide-react';
import { Modal } from './Modal';

const COOKIE_STORAGE_KEY = 'cs_cookie_consent';

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true
    preferences: true,
    analytics: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!saved) {
      // Small timeout for smooth initial load
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(saved);
        setPreferences(parsed.categories || { necessary: true, preferences: true, analytics: false });
      } catch {
        setIsVisible(true);
      }
    }

    const handleOpenSettings = () => {
      setShowPreferences(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('open-cookie-settings', handleOpenSettings);
    };
  }, []);

  const saveConsent = (categories) => {
    const payload = {
      categories,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(payload));
    setPreferences(categories);
    setIsVisible(false);
    setShowPreferences(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ necessary: true, preferences: true, analytics: true });
  };

  const handleRejectNonEssential = () => {
    saveConsent({ necessary: true, preferences: false, analytics: false });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && !showPreferences && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-lg z-50"
          >
            <div className="bg-surface/95 backdrop-blur-md -webkit-backdrop-blur-md border border-border rounded-2xl p-5 shadow-2xl transition-colors">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-brand/10 text-brand shrink-0">
                  <Cookie className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                    Privacy & Cookie Notice
                    <ShieldCheck className="w-4 h-4 text-brand" aria-hidden="true" />
                  </h4>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    We use cookies to secure authentication, store Bengaluru map preferences, and analyze charger availability in accordance with the Digital Personal Data Protection Act 2023.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-brand hover:opacity-90 text-brand-contrast shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center justify-center touch-target-min"
                >
                  Accept All
                </button>
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-bg-soft hover:bg-bg-elevated text-text-secondary transition-all border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-border flex items-center justify-center touch-target-min"
                >
                  Reject Non-Essential
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreferences(true)}
                  className="px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-text-muted hover:text-brand transition-colors sm:ml-auto flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand touch-target-min"
                >
                  <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Preferences
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences Modal */}
      <Modal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        title="Cookie & Privacy Preferences"
        subtitle="Manage your cookie settings and personal data consent"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Configure how ChargeShare India uses cookies and local storage tokens on your device. Strictly necessary cookies cannot be disabled as they ensure platform security and session integrity.
          </p>

          {/* Necessary */}
          <div className="p-3.5 rounded-xl border border-border bg-bg-soft flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary">Strictly Necessary</span>
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand/10 text-brand">
                  Required
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Essential for JWT authentication tokens, Razorpay test transaction security, and CSRF protection.
              </p>
            </div>
            <div className="shrink-0 p-1.5 rounded-full bg-brand text-brand-contrast">
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </div>

          {/* Preferences */}
          <div className="p-3.5 rounded-xl border border-border bg-bg-soft flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-text-primary">Preferences & Personalization</span>
              <p className="text-xs text-text-secondary mt-1">
                Remembers your chosen Bengaluru map zoom coordinates, active vehicle connector filter, and dark/light UI theme.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={preferences.preferences}
                onChange={(e) => setPreferences((p) => ({ ...p, preferences: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
            </label>
          </div>

          {/* Analytics */}
          <div className="p-3.5 rounded-xl border border-border bg-bg-soft flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-text-primary">Telemetry & Performance</span>
              <p className="text-xs text-text-secondary mt-1">
                Collects aggregated, privacy-safe analytics to help us detect faulty charging bays and minimize app latency.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences((p) => ({ ...p, analytics: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
            </label>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t border-border flex gap-2.5">
            <button
              type="button"
              onClick={handleSaveCustom}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-brand hover:opacity-90 text-brand-contrast shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Save Preferences
            </button>
            <button
              type="button"
              onClick={handleRejectNonEssential}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-bg-soft hover:bg-bg-elevated text-text-secondary transition-all border border-border"
            >
              Decline All
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand hover:opacity-90 text-brand-contrast transition-all shadow-sm"
            >
              Accept All
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
