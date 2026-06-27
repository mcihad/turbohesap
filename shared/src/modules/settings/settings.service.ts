// Contract for the per-user settings store (/api/settings). Always scoped to the
// current user (resolved from the token) — there is no cross-user access.
export interface ISettingsService {
  /** The stored data for `type`, or null if the user has none. */
  get<T = unknown>(type: string): Promise<T | null>
  /** Create or replace the user's setting for `type`. */
  set<T = unknown>(type: string, data: T): Promise<void>
  remove(type: string): Promise<void>
}
