import { Component, ReactNode, ErrorInfo } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  componentName?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, componentName } = this.props

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `ErrorBoundary caught error in ${componentName || 'component'}:`,
        error,
        errorInfo
      )
    }

    // Update state with error info
    this.setState({ errorInfo })

    // Call custom error handler
    onError?.(error, errorInfo)

    // Send to error tracking service (Sentry, etc.)
    if (typeof window !== 'undefined' && (window as any).errorTracker) {
      ;(window as any).errorTracker.captureException(error, {
        extra: {
          componentName,
          componentStack: errorInfo.componentStack,
          errorBoundary: true
        }
      })
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback, componentName } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Default fallback UI
      return (
        <GlassCard title="Something went wrong" className="border-red-900/50 bg-red-950/10">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-slate-300 mb-2">
                  {componentName
                    ? `We encountered an error in the ${componentName} component.`
                    : 'We encountered an error loading this component.'}
                </p>
                {error && process.env.NODE_ENV === 'development' && (
                  <details className="mt-2">
                    <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                      Error details
                    </summary>
                    <div className="mt-2 p-2 bg-slate-950/50 rounded border border-slate-800 text-xs text-slate-400 font-mono overflow-auto max-h-40">
                      <div className="text-red-400 mb-1">
                        {error.name}: {error.message}
                      </div>
                      {error.stack && (
                        <pre className="text-[10px] whitespace-pre-wrap">{error.stack}</pre>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>

            <Button onClick={this.handleReset} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          </div>
        </GlassCard>
      )
    }

    return children
  }
}
