import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Production Logging Hook: Send error data to telemetry or error reporting service
    console.error("Uncaught render error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-white dark:bg-[#0f0f11] flex items-center justify-center p-6 z-50">
          <div className="max-w-md w-full bg-white dark:bg-[#151518] rounded-3xl border border-gray-100 dark:border-gray-900 shadow-xl p-8 text-center space-y-6">
            
            {/* Warning Icon Banner */}
            <div className="w-16 h-16 bg-red-500/10 dark:bg-red-500/5 rounded-full flex items-center justify-center mx-auto text-red-500 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-xl font-extrabold text-gray-900 dark:text-white">Something went wrong</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">An unexpected application error crashed the render flow. Please reload the interface or go back home.</p>
            </div>

            {/* Error Detail Stack */}
            {import.meta.env.DEV && this.state.error && (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-left border border-gray-100 dark:border-gray-900 font-mono text-[10px] text-gray-400 max-h-36 overflow-y-auto">
                <p className="font-semibold text-red-500 mb-1">{this.state.error.toString()}</p>
                <p className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</p>
              </div>
            )}

            {/* Recovery actions */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="primary"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Reload Screen
              </Button>
              <Button
                variant="outline"
                onClick={() => { window.location.href = '/'; }}
                leftIcon={<Home className="w-4 h-4" />}
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
