import React from 'react';
import { ZapOff, PlusCircle } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon = ZapOff,
  title = 'No items found',
  description = 'Try adjusting your filters or search terms to find what you need.',
  actionLabel,
  onAction,
  actionIcon: ActionIcon = PlusCircle,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl bg-surface border border-border shadow-luxury-sm ${className}`}
    >
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
          <Icon className="w-8 h-8" />
        </div>
        <div className="absolute -inset-2 bg-brand/20 blur-xl rounded-full -z-10" />
      </div>

      <h4 className="text-lg font-bold text-text-primary mb-1.5 font-heading">
        {title}
      </h4>
      <p className="text-xs sm:text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" size="sm" icon={ActionIcon} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
