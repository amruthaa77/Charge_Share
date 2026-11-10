import React from 'react';
import { Container } from './Container';

export const PageHeader = ({
  badge,
  badgeText,
  category,
  badgeVariant = 'brand', // 'brand' | 'amber' | 'neutral'
  badgeSubtext,
  title,
  description,
  subtitle,
  action,
  children,
  size = 'default',
  className = '',
}) => {
  const displayBadgeText = badgeText || category;
  const displayDescription = description || subtitle;

  const badgeVariantStyles = {
    brand: 'text-brand bg-brand/10 border border-brand/20',
    amber: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25',
    neutral: 'text-text-secondary bg-bg-elevated border border-border',
  };

  return (
    <div className={`border-b border-border bg-bg-raised transition-colors ${className}`}>
      <Container size={size} className="py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            {(badge || displayBadgeText) && (
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {badge ? (
                  badge
                ) : (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 ${
                      badgeVariantStyles[badgeVariant] || badgeVariantStyles.brand
                    }`}
                  >
                    {displayBadgeText}
                  </span>
                )}
                {badgeSubtext && (
                  <span className="text-xs text-text-secondary">{badgeSubtext}</span>
                )}
              </div>
            )}
            <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight leading-tight">
              {title}
            </h1>
            {displayDescription && (
              <p className="text-xs sm:text-sm text-text-secondary mt-1.5 max-w-[60ch] leading-relaxed">
                {displayDescription}
              </p>
            )}
          </div>
          {action && (
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              {action}
            </div>
          )}
        </div>
        {children && <div className="mt-6">{children}</div>}
      </Container>
    </div>
  );
};
