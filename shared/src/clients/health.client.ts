import type { AxiosInstance } from 'axios'

import type { HealthStatus } from '../models/health'
import type { IHealthService } from '../services/health.service'

// HealthApiClient is the axios-backed implementation of IHealthService.
export class HealthApiClient implements IHealthService {
  constructor(private readonly http: AxiosInstance) {}

  async getHealth(): Promise<HealthStatus> {
    const { data } = await this.http.get<HealthStatus>('/health')
    return data
  }
}
