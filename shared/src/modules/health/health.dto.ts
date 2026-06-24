export type HealthState = 'ok' | 'degraded'
export type DatabaseState = 'up' | 'down'

export interface HealthStatus {
  status: HealthState
  database?: DatabaseState
}
