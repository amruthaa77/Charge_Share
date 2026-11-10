import React from 'react';

/**
 * Universal Responsive Container
 * Enforces responsive horizontal padding:
 * - 16px (px-4) on small mobile
 * - 24px (sm:px-6) on tablet
 * - 32px (lg:px-8) on desktop
 * Constrains max width without hard pixel caps.
 */
export const Container = ({
  children,
  className = '',
  as: Component = 'div',
  size = 'default', // 'default' | 'narrow' | 'wide' | 'fluid'
  ...props
}) => {
  const sizeClasses = {
    narrow: 'max-w-4xl',
    default: 'max-w-7xl',
    wide: 'max-w-screen-2xl',
    fluid: 'max-w-none',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.default;

  return (
    <Component
      className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${selectedSize} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};
