import * as React from 'react'
import type {
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  GroupingState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'

import { api } from '@/lib/api'

// The persisted slice of a grid's state — saved per user (settings) under
// `grid:<gridId>` and re-applied on load. Ephemeral bits (page index, row
// selection, group expansion) are intentionally NOT persisted.
export interface PersistedGridState {
  sorting: SortingState
  columnOrder: ColumnOrderState
  columnVisibility: VisibilityState
  columnPinning: ColumnPinningState
  columnFilters: ColumnFiltersState
  grouping: GroupingState
  globalFilter: string
  pageSize: number
}

export function defaultGridState(pageSize = 25): PersistedGridState {
  return {
    sorting: [],
    columnOrder: [],
    columnVisibility: {},
    columnPinning: { left: [], right: [] },
    columnFilters: [],
    grouping: [],
    globalFilter: '',
    pageSize,
  }
}

// Loads the saved grid state once, then debounce-saves it whenever it changes.
// Returns the state + a setter (slice-merging). `ready` is false until the
// initial load resolves, so the table can avoid a flash of default layout.
export function useGridState(
  gridId: string,
  initial: PersistedGridState,
): {
  state: PersistedGridState
  setState: React.Dispatch<React.SetStateAction<PersistedGridState>>
  ready: boolean
} {
  const settingKey = `grid:${gridId}`
  const [state, setState] = React.useState<PersistedGridState>(initial)
  const [ready, setReady] = React.useState(false)
  const loaded = React.useRef(false)

  React.useEffect(() => {
    let active = true
    api.settings
      .get<Partial<PersistedGridState>>(settingKey)
      .then((saved) => {
        if (active && saved) setState((s) => ({ ...s, ...saved }))
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          loaded.current = true
          setReady(true)
        }
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingKey])

  React.useEffect(() => {
    if (!loaded.current) return
    const t = setTimeout(() => {
      void api.settings.set(settingKey, state)
    }, 600)
    return () => clearTimeout(t)
  }, [settingKey, state])

  return { state, setState, ready }
}
