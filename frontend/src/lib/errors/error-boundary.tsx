import * as React from 'react'
import { TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { reportClientError } from './report'

interface State {
  hasError: boolean
}

/**
 * App-level React error boundary. Catches render/lifecycle errors, reports them
 * to the error log (req 2), and shows a recoverable fallback instead of a blank
 * screen.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportClientError(error, {
      source: 'react-error-boundary',
      componentStack: info.componentStack ?? undefined,
    })
  }

  private reset = () => this.setState({ hasError: false })

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <TriangleAlert className="size-10 text-destructive" />
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Bir şeyler ters gitti</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Beklenmeyen bir hata oluştu ve kaydedildi. Sayfayı yenilemeyi
            deneyin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={this.reset}>
            Yeniden dene
          </Button>
          <Button onClick={() => window.location.reload()}>Sayfayı yenile</Button>
        </div>
      </div>
    )
  }
}
