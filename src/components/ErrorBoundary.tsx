import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080C14] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#0D131F] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#FF3366]/20 border border-[#FF3366] flex items-center justify-center shadow-[0_0_15px_rgba(255,51,102,0.3)] shrink-0">
                <AlertTriangle className="w-6 h-6 text-[#FF3366]" />
              </div>
              <div>
                <h2 className="font-['Chakra_Petch'] font-bold text-lg text-white">
                  APPLICATION RECOVERY
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  A client-side error occurred while rendering.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs font-mono text-slate-400 overflow-x-auto">
              <p className="text-[#FF3366] font-semibold mb-1">
                {this.state.error?.message || 'Unknown runtime error'}
              </p>
              {this.state.error?.stack && (
                <pre className="text-[10px] text-slate-500 whitespace-pre-wrap line-clamp-6">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#00FFB4] text-black font-semibold text-xs uppercase tracking-wider hover:brightness-110 shadow-[0_0_12px_rgba(0,255,180,0.3)] transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
              <button
                onClick={this.handleResetCache}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 font-mono text-xs transition-all"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Reset Local Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
