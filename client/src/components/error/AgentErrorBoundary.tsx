import { ErrorBoundary } from './ErrorBoundary'
import { GlassCard } from '@/components/layout/GlassCard'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { ReactNode } from 'react'

interface AgentErrorFallbackProps {
  error?: Error
}

function AgentErrorFallback({ error }: AgentErrorFallbackProps): JSX.Element {
  return (
    <GlassCard 
      title="Agent Mode Unavailable" 
      className="border-amber-900/50 bg-amber-950/10"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-slate-300 mb-2">
            The autonomous agent system encountered an error and couldn't load properly.
          </p>
          <p className="text-xs text-slate-400">
            This may be a temporary issue. Try refreshing the page or check back later.
          </p>
          {error && process.env.NODE_ENV === 'development' && (
            <details className="mt-3">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                Technical details
              </summary>
              <div className="mt-2 p-2 bg-slate-950/50 rounded border border-slate-800 text-xs text-amber-400 font-mono">
                {error.message}
              </div>
            </details>
          )}
        </div>
      </div>
      <div className="mt-4 p-3 bg-slate-900/50 rounded border border-slate-700/50">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="w-4 h-4" />
          <span>You can still use other workspace features while we work on this issue.</span>
        </div>
      </div>
    </GlassCard>
  )
}

interface AgentErrorBoundaryProps {
  children: ReactNode
}

export function AgentErrorBoundary({ children }: AgentErrorBoundaryProps): JSX.Element {
  return (
    <ErrorBoundary
      componentName="Agent Mode"
      fallback={<AgentErrorFallback />}
      onError={(error, errorInfo) => {
        // Log agent-specific errors with additional context
        console.error('Agent Mode Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString()
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
