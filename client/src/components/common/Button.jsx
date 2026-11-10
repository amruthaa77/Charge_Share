import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs font-semibold rounded-xl gap-1.5',
    md: 'px-4 py-2 text-sm font-semibold rounded-xl gap-2',
    lg: 'px-6 py-2.5 text-base font-bold rounded-2xl gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-brand hover:opacity-90 text-brand-contrast font-bold border border-brand/20 shadow-luxury transition-all',
    eco:
      'bg-brand hover:opacity-90 text-brand-contrast font-bold border border-brand/20 shadow-luxury transition-all',
    lime:
      'bg-brand hover:opacity-90 text-brand-contrast font-extrabold border border-brand/20 shadow-luxury transition-all',
    secondary:
      'bg-surface hover:bg-bg-elevated text-text-primary border border-border shadow-luxury-sm transition-all',
    outline:
      'border border-border hover:border-brand text-text-primary hover:bg-bg-elevated bg-transparent transition-all',
    ghost:
      'bg-transparent hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all',
    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all',
  };

  return (
    <motion.button
      whileHover={!disabled && !isLoading ? { scale: 1.015, y: -1.5 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.97 } : {}}
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all min-h-[44px] ${sizeClasses[size]} ${variantClasses[variant]} ${
        disabled ? 'opacity-50 cursor-not-allowed filter grayscale' : 'cursor-pointer'
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current flex-shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 text-current flex-shrink-0" />
      ) : null}
      <span>{children}</span>
    </motion.button>
  );
};
