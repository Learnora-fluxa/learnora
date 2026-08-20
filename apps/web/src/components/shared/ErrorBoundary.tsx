import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err)
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
        <div className="bg-surface rounded-card shadow-sm p-10 max-w-md w-full text-center">
          <div className="size-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            An unexpected error occurred. Refreshing the page usually fixes it.
          </p>
          {this.state.message && (
            <p className="text-xs text-muted font-mono bg-canvas rounded-card px-4 py-3 mb-6 text-left break-all">
              {this.state.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary mx-auto"
          >
            <RefreshCw size={14} /> Reload page
          </button>
        </div>
      </div>
    )
  }
}
