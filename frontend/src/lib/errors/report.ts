import { api } from '@/lib/api'

// Client-side global error capture (req 2, client half). Unhandled errors and
// rejections, plus React render errors (via ErrorBoundary), are POSTed to
// /api/iam/error-logs/client where they're deduped server-side. We also throttle
// locally so a tight error loop doesn't flood the network.

const recentlySent = new Set<string>()
const THROTTLE_MS = 60_000

function fingerprint(message: string, stack?: string): string {
  const frame = (stack ?? '').split('\n')[1]?.trim() ?? ''
  return `${message}::${frame}`
}

function currentModule(path: string): string | undefined {
  return path.split('/').filter(Boolean)[0] || undefined
}

export interface ReportInfo {
  source?: string
  componentStack?: string
}

export function reportClientError(error: unknown, info: ReportInfo = {}): void {
  try {
    const err = error instanceof Error ? error : undefined
    const message = err?.message ?? String(error)
    if (!message) return

    let stack = err?.stack
    if (info.componentStack) {
      stack = `${stack ?? message}\n--- component stack ---${info.componentStack}`
    }

    const fp = fingerprint(message, stack)
    if (recentlySent.has(fp)) return
    recentlySent.add(fp)
    setTimeout(() => recentlySent.delete(fp), THROTTLE_MS)

    const path = window.location.pathname
    void api.iam.errorLogs
      .report({
        message,
        exceptionType: err?.name ?? 'Error',
        stackTrace: stack,
        source: info.source,
        path,
        module: currentModule(path),
        userAgent: navigator.userAgent,
      })
      .catch(() => {
        // Never let error reporting throw.
      })
  } catch {
    // swallow
  }
}

/** Attach window-level handlers. Call once at startup. */
export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    reportClientError(event.error ?? event.message, { source: 'window.onerror' })
  })
  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason, { source: 'unhandledrejection' })
  })
}
