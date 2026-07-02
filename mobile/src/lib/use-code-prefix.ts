// useCodePrefix (mobile) — RN counterpart of the web hook behind
// `<CodePrefixInput>`. Same increment-timing contract (see the web version
// at frontend/src/components/code-prefix/use-code-prefix.ts for the full
// rationale): `incrementOnSave=false` prefixes consume immediately on pick,
// `incrementOnSave=true` prefixes only peek until `finalize()` is called
// right before the parent screen's own save request. Manually typing into
// the number segment always wins — `finalize()` never calls `consume` for a
// hand-edited value. No TanStack Query here (mobile has none) — list
// refresh after a consume is a plain `refetch()` instead of a cache
// invalidation.

import * as React from 'react'
import { LookupsPermissions, type CodePrefixDto } from '@turbohesap/shared'

import { api } from './api'
import { useAuth } from './auth/auth-context'
import { useAsync } from './use-async'

const SETTING_KEY = (context: string) => `codePrefix:${context}`

export function useCodePrefix({ context, enabled = true }: { context: string; enabled?: boolean }) {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(LookupsPermissions.codePrefixesRead)
  // `enabled=false` (e.g. an editable field that already holds a real value)
  // must skip auto-restore/auto-consume — the list itself still loads (see
  // `canRead` below), which lets the input split that existing value into
  // its known prefix + number segments for display.
  const canUse = enabled && canRead

  const list = useAsync(() => api.codePrefixes.list(context), [context], { enabled: canRead })
  const prefixes = React.useMemo(() => (list.data ?? []).filter((p) => p.isActive), [list.data])

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [displayValue, setDisplayValue] = React.useState('')
  const [manuallyEdited, setManuallyEdited] = React.useState(false)
  const [isBusy, setIsBusy] = React.useState(false)
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
        list.refetch()
      }
    } finally {
      setIsBusy(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.refetch])

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
      void applySelection(remembered ?? prefixes[0])
    })
    return () => {
      cancelled = true
    }
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
    list.refetch()
    return code
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayValue, list.refetch, manuallyEdited, selectedId])

  return {
    prefixes,
    isLoading: list.loading,
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
