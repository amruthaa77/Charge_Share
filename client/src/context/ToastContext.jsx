import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title, message, duration = 4500 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
      return id;
    },
    []
  );

  const toast = {
    success: (message, title = 'Success') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => addToast({ type: 'error', title, message }),
    warning: (message, title = 'Attention') => addToast({ type: 'warning', title, message }),
    info: (message, title = 'Information') => addToast({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem = ({ toast, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const remainingTimeRef = useRef(toast.duration);
  const startTimeRef = useRef(Date.now());

  const getThemeStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          border: 'border-brand/40',
          bg: 'bg-surface',
          iconColor: 'text-brand',
          progressBg: 'bg-brand',
          icon: <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />,
        };
      case 'error':
        return {
          border: 'border-rose-500/40',
          bg: 'bg-surface',
          iconColor: 'text-rose-500',
          progressBg: 'bg-rose-500',
          icon: <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />,
        };
      case 'warning':
        return {
          border: 'border-amber-500/40',
          bg: 'bg-surface',
          iconColor: 'text-amber-500',
          progressBg: 'bg-amber-500',
          icon: <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />,
        };
      case 'info':
      default:
        return {
          border: 'border-brand/40',
          bg: 'bg-surface',
          iconColor: 'text-brand',
          progressBg: 'bg-brand',
          icon: <Info className="w-5 h-5 shrink-0" aria-hidden="true" />,
        };
    }
  };

  const styles = getThemeStyles();

  React.useEffect(() => {
    if (isPaused) return;

    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingTimeRef.current);

    startTimeRef.current = Date.now();

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [isPaused, onDismiss, toast.id]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    clearTimeout(timerRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(remainingTimeRef.current - elapsed, 500);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full max-w-sm rounded-xl shadow-xl overflow-hidden border ${styles.border} ${styles.bg} p-4 pointer-events-auto transition-colors`}
    >
      <div className="flex items-start gap-3">
        <div className={styles.iconColor}>{styles.icon}</div>
        <div className="flex-1 min-w-0 pr-2">
          {toast.title && (
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
              {toast.title}
            </h4>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
            {toast.message}
          </p>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="shrink-0 p-2 min-h-[44px] min-w-[44px] rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 flex items-center justify-center touch-target-min"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Progress countdown indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: isPaused ? undefined : '0%' }}
          transition={{
            duration: isPaused ? 0 : remainingTimeRef.current / 1000,
            ease: 'linear',
          }}
          className={`h-full ${styles.progressBg}`}
        />
      </div>
    </motion.div>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-md pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};
