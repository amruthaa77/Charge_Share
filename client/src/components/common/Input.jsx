import React, { forwardRef, memo } from 'react';

export const Input = memo(
  forwardRef(
    (
      {
        label,
        error,
        helperText,
        icon: Icon,
        rightIcon: RightIcon,
        onRightIconClick,
        className = '',
        type = 'text',
        id,
        ...props
      },
      ref
    ) => {
      const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

      return (
        <div className="w-full space-y-1.5 text-left">
          {label && (
            <label htmlFor={inputId} className="block text-xs font-semibold text-text-secondary tracking-wide">
              {label}
            </label>
          )}
          <div className="relative">
            {Icon && (
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <input
              ref={ref}
              id={inputId}
              type={type}
              aria-invalid={Boolean(error)}
              aria-describedby={error && inputId ? `${inputId}-error` : helperText && inputId ? `${inputId}-helper` : undefined}
              className={`w-full rounded-xl bg-bg-raised/80 dark:bg-bg-raised/90 border text-sm text-text-primary placeholder:text-text-muted/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed ${
                Icon ? 'pl-11' : 'pl-3.5'
              } ${RightIcon ? 'pr-11' : 'pr-3.5'} py-2.5 ${
                error ? 'border-danger/60 focus:ring-danger/30 focus:border-danger' : 'border-border hover:border-border-strong'
              } ${className}`}
              {...props}
            />
            {RightIcon && (
              <button
                type="button"
                onClick={onRightIconClick}
                tabIndex={onRightIconClick ? 0 : -1}
                className={`absolute inset-y-0 right-0 pr-3.5 flex items-center ${
                  onRightIconClick ? 'text-text-muted hover:text-text-primary cursor-pointer' : 'pointer-events-none text-text-muted'
                }`}
              >
                <RightIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          {error ? (
            <p id={inputId ? `${inputId}-error` : undefined} className="text-[11px] text-danger font-medium flex items-center gap-1 mt-1">
              <span>{error}</span>
            </p>
          ) : helperText ? (
            <p id={inputId ? `${inputId}-helper` : undefined} className="text-[11px] text-text-muted mt-1">{helperText}</p>
          ) : null}
        </div>
      );
    }
  )
);

Input.displayName = 'Input';
