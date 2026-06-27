// usePaginated — accumulating paged fetch for infinite-scroll lists. Loads page 1
// on mount / deps change, appends further pages via loadMore(), and supports
// pull-to-refresh. The RN counterpart of the web's infinite query, over the
// shared `Page<T>` contract.

import * as React from 'react'
import { toApiError, type Page } from '@turbohesap/shared'

export interface PaginatedState<T> {
  items: T[]
  total: number
  /** Initial page-1 load. */
  loading: boolean
  /** A subsequent page is being appended. */
  loadingMore: boolean
  /** Pull-to-refresh (re-loads page 1). */
  refreshing: boolean
  error: string | null
  hasMore: boolean
  /** Fetch + append the next page (no-op while busy or exhausted). */
  loadMore: () => void
  /** Reload from page 1 (pull-to-refresh). */
  refresh: () => void
}

export function usePaginated<T>(
  fetchPage: (page: number) => Promise<Page<T>>,
  deps: React.DependencyList = [],
  options: { enabled?: boolean } = {},
): PaginatedState<T> {
  const enabled = options.enabled ?? true
  const [items, setItems] = React.useState<T[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(enabled)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fnRef = React.useRef(fetchPage)
  fnRef.current = fetchPage
  const inFlight = React.useRef(false)

  const loadPage = React.useCallback(
    async (target: number, mode: 'initial' | 'more' | 'refresh') => {
      if (!enabled || inFlight.current) return
      inFlight.current = true
      if (mode === 'initial') setLoading(true)
      else if (mode === 'more') setLoadingMore(true)
      else setRefreshing(true)
      setError(null)
      try {
        const res = await fnRef.current(target)
        setTotal(res.total)
        setPage(res.page)
        setItems((prev) => (target <= 1 ? res.items : [...prev, ...res.items]))
      } catch (err) {
        setError(toApiError(err).message)
      } finally {
        setLoading(false)
        setLoadingMore(false)
        setRefreshing(false)
        inFlight.current = false
      }
    },
    [enabled],
  )

  // Initial load / reset whenever the inputs change.
  React.useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setItems([])
    setTotal(0)
    setPage(1)
    void loadPage(1, 'initial')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  const hasMore = items.length < total

  const loadMore = React.useCallback(() => {
    if (!enabled || loading || loadingMore || refreshing || inFlight.current) return
    if (items.length >= total) return // nothing more (also covers the empty case)
    void loadPage(page + 1, 'more')
  }, [enabled, loading, loadingMore, refreshing, items.length, total, page, loadPage])

  const refresh = React.useCallback(() => void loadPage(1, 'refresh'), [loadPage])

  return { items, total, loading, loadingMore, refreshing, error, hasMore, loadMore, refresh }
}
