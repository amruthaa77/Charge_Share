import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class ScopedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ScopedErrorBoundary:${this.props.name || 'Component'}] caught an error:`, error);
    console.error('Component Stack:', errorInfo?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, idx) => key !== (prevProps.resetKeys && prevProps.resetKeys[idx])
      );
      if (hasChanged) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta.env?.DEV);
      const title = this.props.fallbackTitle || 'Section temporarily unavailable';
      const message =
        this.props.fallbackMessage ||
        'We encountered an issue displaying this component. Other features remain fully functional.';

      return (
        <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center bg-forest-900/5 dark:bg-slate-900/60 rounded-3xl border border-forest-900/10 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-editorial text-forest-900 dark:text-white mb-1">
            {title}
          </h3>
          <p className="text-xs text-forest-600 dark:text-slate-400 max-w-sm mb-4">
            {message}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="px-4 py-2 bg-forest-900 hover:bg-forest-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-luxury-sm transition-all min-h-[38px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{this.props.actionLabel || 'Retry View'}</span>
          </button>

          {isDev && this.state.error && (
            <details className="mt-4 text-left max-w-md w-full bg-forest-900/10 dark:bg-black/40 rounded-xl p-3 text-[11px] font-mono text-forest-800 dark:text-slate-300 overflow-x-auto">
              <summary className="cursor-pointer font-bold text-amber-700 dark:text-amber-400 select-none">
                Technical details (Dev Mode)
              </summary>
              <div className="mt-2 text-red-600 dark:text-red-400 font-semibold">
                {this.state.error.message}
              </div>
              <pre className="mt-1 whitespace-pre-wrap text-[10px] opacity-80 max-h-40 overflow-y-auto">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
