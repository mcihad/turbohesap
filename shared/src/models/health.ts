// Health DTO returned by GET /api/health. `database` is present only when a
// database is configured on the backend.

export type HealthState = 'ok' | 'degraded'
export type DatabaseState = 'up' | 'down'

export interface HealthStatus {
  status: HealthState
  database?: DatabaseState
}
