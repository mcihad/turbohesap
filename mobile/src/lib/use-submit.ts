// useSubmit — the mobile mutation helper (no TanStack Query). Wraps an async
// action with a busy flag and surfaces failures via a native Alert using the
// shared ApiError message. On success the caller typically goes back; the list/
// detail screen remounts on return (see nav-context) and refetches, so there's
// no cache to invalidate.

import * as React from 'react'
import { Alert } from 'react-native'
import { toApiError } from '@turbohesap/shared'

export function useSubmit() {
  const [busy, setBusy] = React.useState(false)
  const busyRef = React.useRef(false)

  const submit = React.useCallback(
    async (
      fn: () => Promise<void>,
      opts?: { onSuccess?: () => void; errorTitle?: string },
    ) => {
      if (busyRef.current) return
      busyRef.current = true
      setBusy(true)
      try {
        await fn()
        opts?.onSuccess?.()
      } catch (e) {
        Alert.alert(opts?.errorTitle ?? 'İşlem başarısız', toApiError(e).message)
      } finally {
        busyRef.current = false
        setBusy(false)
      }
    },
    [],
  )

  return { submit, busy }
}

/** Confirm a destructive action with a native dialog, then run `onConfirm`. */
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Sil',
) {
  Alert.alert(title, message, [
    { text: 'İptal', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ])
}
