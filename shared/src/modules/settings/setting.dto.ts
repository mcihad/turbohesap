// User settings — a generic per-user key/value store. `type` identifies what the
// setting is for (e.g. a specific page's data grid: "grid:inventory.products"),
// and `data` is an opaque jsonb payload whose shape depends on the type (grid
// column order/widths/sort/filters, UI preferences, …). One row per (user, type).

export interface UserSettingDto<T = unknown> {
  type: string
  data: T
}

// Body for PUT /api/settings/:type — the jsonb payload to store.
export interface SetUserSettingRequest<T = unknown> {
  data: T
}
