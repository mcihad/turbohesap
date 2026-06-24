import type { HealthStatus } from './health.dto'

export interface IHealthService {
  getHealth(): Promise<HealthStatus>
}
