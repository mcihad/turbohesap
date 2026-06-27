// Lookup items — a generic key/value reference-data system used across the app.
// Every item belongs to a named LIST (the group, e.g. "birim"/unit) and carries
// a stable `key` (code) and a human `value` (label). The same shapes are used by
// the management screen and the reusable LookupSelect component on web + mobile.

export interface LookupItemDto {
  id: string
  /** The list/group this item belongs to (e.g. "birim", "renk"). */
  list: string
  /** Stable code, unique within its list (e.g. "ADET"). */
  key: string
  /** Display label shown in the UI (e.g. "Adet"). */
  value: string
  /** Ascending order within the list. */
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Summary of one list (for the management overview / pickers).
export interface LookupListInfo {
  list: string
  count: number
}

export interface CreateLookupItemRequest {
  list: string
  value: string
  /** Optional; the backend derives a slug from `value` when omitted. */
  key?: string
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateLookupItemRequest {
  /** Move the item to another list (optional). */
  list?: string
  key?: string
  value?: string
  sortOrder?: number
  isActive?: boolean
}
