import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Copy, Check, X } from 'lucide-react';

/**
 * Standardized form-level alert banner for ChargeShare India.
 * Conforms to role="alert" with title, message, optional action, and requestId.
 */
export const ErrorAlert = ({
  error,
  title,
  message,
  action,
  requestId,
  onDismiss,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  // Support passing raw error object or individual props
  const resolvedTitle = title || error?.title || 'Notice';
  const resolvedMessage = message || error?.message || 'An error occurred. Please try again.';
  const resolvedAction = action || error?.action || null;
  const resolvedRequestId = requestId || error?.requestId || null;

  if (!resolvedMessage && !resolvedTitle) return null;

  const handleCopyId = () => {
    if (!resolvedRequestId) return;
    navigator.clipboard.writeText(resolvedRequestId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="alert"
      className={`rounded-2xl p-4 bg-danger/10 border border-danger/30 text-left transition-all ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1 rounded-lg bg-danger/20 text-danger shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary mb-1">
            {resolvedTitle}
          </h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            {resolvedMessage}
          </p>

          {resolvedAction && (
            <div className="mt-2.5">
              {resolvedAction.href ? (
                <Link
                  to={resolvedAction.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark transition-colors underline underline-offset-2"
                >
                  {resolvedAction.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : resolvedAction.onClick ? (
                <button
                  type="button"
                  onClick={resolvedAction.onClick}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark transition-colors underline underline-offset-2"
                >
                  {resolvedAction.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          )}

          {resolvedRequestId && (
            <div className="mt-2.5 pt-2 border-t border-danger/15 flex items-center gap-2 text-[11px] text-text-muted">
              <span>Ref ID: <code className="font-mono text-text-secondary select-all">{resolvedRequestId}</code></span>
              <button
                type="button"
                onClick={handleCopyId}
                title="Copy Reference ID"
                className="hover:text-text-primary p-0.5 rounded transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-brand" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="text-text-muted hover:text-text-primary p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
