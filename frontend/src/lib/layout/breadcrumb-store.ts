import * as React from 'react'

// A tiny external store for per-path breadcrumb labels. Dynamic routes (e.g.
// /iam/users/$id) carry an opaque id in the URL; a detail page registers a
// human label (the username) for its path so the breadcrumb shows something
// meaningful instead of the raw id.
//
// Implemented as a module store (not React state) so registering from a page
// never triggers a render loop and is lint-clean (no setState-in-effect).

const labels = new Map<string, string>()
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version += 1
  for (const l of listeners) l()
}

export function setBreadcrumbLabel(path: string, label: string): void {
  if (labels.get(path) !== label) {
    labels.set(path, label)
    emit()
  }
}

export function clearBreadcrumbLabel(path: string): void {
  if (labels.delete(path)) emit()
}

export function getBreadcrumbLabel(path: string): string | undefined {
  return labels.get(path)
}

/** Subscribe a component to label changes (returns the current version). */
export function useBreadcrumbLabelsVersion(): number {
  return React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => version,
    () => version,
  )
}

/** Register a breadcrumb label for `path` while the component is mounted. */
export function useRegisterBreadcrumbLabel(
  path: string | undefined,
  label: string | undefined,
): void {
  React.useEffect(() => {
    if (!path || !label) return
    setBreadcrumbLabel(path, label)
    return () => clearBreadcrumbLabel(path)
  }, [path, label])
}
