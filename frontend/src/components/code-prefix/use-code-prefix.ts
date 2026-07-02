import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { LookupsPermissions, type CodePrefixDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'

const SETTING_KEY = (context: string) => `codePrefix:${context}`

/**
 * Business logic behind `<CodePrefixInput>`: fetches the prefixes available
 * for a `context`, remembers the last-picked one per context (via the
 * Settings subsystem, per-user), and manages the increment-timing contract —
 * `incrementOnSave=false` prefixes consume immediately on pick;
 * `incrementOnSave=true` prefixes only peek until `finalize()` is called
 * (call this right before the parent form's own save request). Manually
 * typing into the field always wins — `finalize()` never calls `consume` for
 * a hand-edited value.
 */
export function useCodePrefix({ context, enabled = true }: { context: string; enabled?: boolean }) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(LookupsPermissions.codePrefixesRead)
  // `enabled=false` (e.g. the field is disabled/locked, editing an existing
  // record) must fully skip prefix restoration/consumption — otherwise
  // reopening an existing record would silently re-consume a code every
  // time. The LIST itself may still load while disabled (see `canRead`
  // below) — that's read-only and lets the input split a locked value into
  // its known prefix + number segments for display.
  const canUse = enabled && canRead

  const query = useQuery({
    queryKey: ['lookups', 'code-prefixes', context],
    queryFn: () => api.codePrefixes.list(context),
    enabled: canRead,
  })
  const prefixes = React.useMemo(
    () => (query.data ?? []).filter((p) => p.isActive),
    [query.data],
  )

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [displayValue, setDisplayValue] = React.useState('')
  const [manuallyEdited, setManuallyEdited] = React.useState(false)
  const [isBusy, setIsBusy] = React.useState(false)
  // Already-consumed code for the current selection — finalize() reuses this
  // instead of consuming twice.
  const consumedRef = React.useRef<string | null>(null)
  const restoredRef = React.useRef(false)

  const selected = React.useMemo(
    () => prefixes.find((p) => p.id === selectedId) ?? null,
    [prefixes, selectedId],
  )

  const applySelection = React.useCallback(async (prefix: CodePrefixDto) => {
    setSelectedId(prefix.id)
    setManuallyEdited(false)
    consumedRef.current = null
    setIsBusy(true)
    try {
      if (prefix.incrementOnSave) {
        const { code } = await api.codePrefixes.peek(prefix.id)
        setDisplayValue(code)
      } else {
        const { code } = await api.codePrefixes.consume(prefix.id)
        consumedRef.current = code
        setDisplayValue(code)
        void qc.invalidateQueries({ queryKey: ['lookups', 'code-prefixes', context] })
      }
    } finally {
      setIsBusy(false)
    }
  }, [context, qc])

  const selectPrefix = React.useCallback((id: string) => {
    const prefix = prefixes.find((p) => p.id === id)
    if (!prefix) return
    void api.settings.set(SETTING_KEY(context), { prefixId: id })
    void applySelection(prefix)
  }, [applySelection, context, prefixes])

  // Restore the last-used prefix for this context once the list is loaded.
  React.useEffect(() => {
    if (restoredRef.current || !canUse || prefixes.length === 0) return
    restoredRef.current = true
    let cancelled = false
    void api.settings.get<{ prefixId: string }>(SETTING_KEY(context)).then((saved) => {
      if (cancelled) return
      const remembered = saved?.prefixId ? prefixes.find((p) => p.id === saved.prefixId) : undefined
      const fallback = remembered ?? prefixes[0]
      void applySelection(fallback)
    })
    return () => { cancelled = true }
  }, [applySelection, canUse, context, prefixes])

  const onManualChange = React.useCallback((text: string) => {
    setManuallyEdited(true)
    consumedRef.current = null
    setDisplayValue(text)
  }, [])

  const finalize = React.useCallback(async (): Promise<string> => {
    if (manuallyEdited || !selectedId) return displayValue
    if (consumedRef.current) return consumedRef.current
    const { code } = await api.codePrefixes.consume(selectedId)
    consumedRef.current = code
    setDisplayValue(code)
    void qc.invalidateQueries({ queryKey: ['lookups', 'code-prefixes', context] })
    return code
  }, [context, displayValue, manuallyEdited, qc, selectedId])

  return {
    prefixes,
    isLoading: query.isLoading,
    selectedId,
    selected,
    selectPrefix,
    displayValue,
    isBusy,
    manuallyEdited,
    onManualChange,
    finalize,
  }
}

export type UseCodePrefixReturn = ReturnType<typeof useCodePrefix>
