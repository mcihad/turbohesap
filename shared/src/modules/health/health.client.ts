import type { AxiosInstance } from 'axios'

import type { HealthStatus } from './health.dto'
import type { IHealthService } from './health.service'

// axios-backed implementation of IHealthService → /api/health.
export class HealthApiClient implements IHealthService {
  constructor(private readonly http: AxiosInstance) {}

  async getHealth(): Promise<HealthStatus> {
    const { data } = await this.http.get<HealthStatus>('/health')
    return data
  }
}
