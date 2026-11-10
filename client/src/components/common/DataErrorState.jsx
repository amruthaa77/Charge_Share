import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { getErrorMessage } from '../../utils/errorMapper';

/**
 * Standardized Error State view for data-driven screens across ChargeShare India.
 * Replaces silent drops or false empty states with informative error feedback and retry action.
 */
export const DataErrorState = ({
  error,
  title = "Couldn't load data",
  description,
  onRetry,
  retryLabel = 'Retry',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const parsed = error ? getErrorMessage(error) : null;

  const resolvedTitle = title || parsed?.title || "Couldn't load data";
  const resolvedDescription =
    description || parsed?.message || 'A network or server issue occurred while loading this information.';
  const requestId = parsed?.requestId;

  const handleCopyId = () => {
    if (!requestId) return;
    navigator.clipboard.writeText(requestId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl bg-surface border border-danger/30 shadow-luxury-sm ${className}`}
    >
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/25 flex items-center justify-center text-danger">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="absolute -inset-2 bg-danger/15 blur-xl rounded-full -z-10" />
      </div>

      <h4 className="text-lg font-bold text-text-primary mb-1.5 font-heading">
        {resolvedTitle}
      </h4>
      <p className="text-xs sm:text-sm text-text-secondary max-w-sm mb-5 leading-relaxed">
        {resolvedDescription}
      </p>

      {requestId && (
        <div className="mb-6 flex items-center gap-1.5 text-[11px] text-text-muted bg-bg-raised/60 px-3 py-1.5 rounded-lg border border-border">
          <span>Reference ID: <code className="font-mono text-text-secondary select-all">{requestId}</code></span>
          <button
            type="button"
            onClick={handleCopyId}
            title="Copy Reference ID"
            className="hover:text-text-primary p-0.5 rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-brand" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {onRetry && (
        <Button variant="primary" size="sm" icon={RefreshCw} onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
