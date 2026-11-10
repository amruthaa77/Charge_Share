import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep latest onClose callback in a ref so effects never need it in dependency arrays
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    // 1. Remember what had focus before the modal opened (only on open transition)
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    // 2. Set initial focus once on modal open
    const timer = setTimeout(() => {
      if (modalRef.current) {
        // Prioritize explicit autofocus attribute
        const autoFocusEl = modalRef.current.querySelector('[autofocus], [data-autofocus]');
        if (autoFocusEl) {
          autoFocusEl.focus();
          return;
        }
        // Next prioritize first form input/textarea/select so user can type immediately
        const firstInput = modalRef.current.querySelector(
          'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
        );
        if (firstInput) {
          firstInput.focus();
          return;
        }
        // Fallback to first focusable element (e.g. close button or first action button)
        const focusable = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 50);

    // 3. Focus trap and Escape handler
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Handle back button on mobile (Android popstate closes modal)
    const handlePopState = () => {
      onCloseRef.current?.();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      // Restore focus to opener element when modal closes or unmounts
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]); // Strict dependency on isOpen only - never re-triggers on parent renders

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto overscroll-contain"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onCloseRef.current?.()}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm -webkit-backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className={`relative w-full ${maxWidth} bg-surface border border-border text-text-primary rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-luxury-xl z-10 my-0 sm:my-8 max-h-[92dvh] sm:max-h-[85dvh] pb-safe overflow-y-auto overscroll-contain transition-colors`}
          >
            {/* Mobile Drag/Grab Bar */}
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4 sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <h3
                  id="modal-title"
                  className="text-xl font-bold text-text-primary tracking-tight font-editorial"
                >
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onCloseRef.current?.()}
                className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center justify-center touch-target-min"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Content Body */}
            <div className="mt-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};
