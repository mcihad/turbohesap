import type { HealthStatus } from '../models/health'

// IHealthService reports backend liveness (and database connectivity when
// configured) from GET /api/health.
export interface IHealthService {
  getHealth(): Promise<HealthStatus>
}
