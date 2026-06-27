// useAsync — a tiny data-fetching hook (the mobile app has no TanStack Query).
// Runs `fn` on mount and whenever `deps` change, exposing data/loading/error and
// a `refetch` for pull-to-refresh. Pass `enabled: false` to gate the call (the
// RN equivalent of the web's `enabled: hasPermission(...)`).

import * as React from 'react'
import { toApiError } from '@turbohesap/shared'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
  /** True while a pull-to-refresh (not the initial load) is in flight. */
  refreshing: boolean
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList = [],
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const enabled = options.enabled ?? true
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(enabled)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fnRef = React.useRef(fn)
  fnRef.current = fn

  const run = React.useCallback(
    async (isRefresh: boolean) => {
      if (!enabled) {
        setLoading(false)
        return
      }
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const result = await fnRef.current()
        setData(result)
      } catch (err) {
        setError(toApiError(err).message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [enabled],
  )

  React.useEffect(() => {
    void run(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  const refetch = React.useCallback(() => void run(true), [run])

  return { data, loading, error, refetch, refreshing }
}
