import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-red-800 bg-red-900/20">
          <CardHeader>
            <CardTitle className="text-red-200">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-300">
              An error occurred while rendering this component. Please try refreshing the page.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs text-red-400">
                <summary>Error Details</summary>
                <pre className="mt-2 p-2 bg-red-950/50 rounded border border-red-800">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <Button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              variant="outline"
              className="border-red-700 text-red-300 hover:bg-red-900/30"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
