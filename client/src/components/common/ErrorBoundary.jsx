import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ChargeShare India ErrorBoundary caught an exception:');
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Component stack:', errorInfo?.componentStack);
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
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta.env?.DEV);

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-base dark:bg-[#070B14]">
          <div className="max-w-md w-full bg-white dark:bg-[#0E1626] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8" aria-hidden="true" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading tracking-tight mb-2">
              Charging View Interrupted
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              An unexpected error occurred while rendering this interface. Your data and active charging sessions remain safe.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                Go to Home
              </button>
            </div>

            {isDev && this.state.error && (
              <details className="mt-4 text-left w-full bg-slate-100 dark:bg-slate-900 rounded-xl p-3 text-[11px] font-mono text-slate-800 dark:text-slate-300 overflow-x-auto">
                <summary className="cursor-pointer font-bold text-amber-600 dark:text-amber-400 select-none">
                  Technical details (Dev Mode)
                </summary>
                <div className="mt-2 text-red-600 dark:text-red-400 font-semibold break-all">
                  {this.state.error.message}
                </div>
                <pre className="mt-1 whitespace-pre-wrap text-[10px] opacity-80 max-h-40 overflow-y-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
