import type { AxiosInstance } from 'axios'

import type { CrmDashboardDto, CrmDashboardQuery } from './crm-analytics.dto'
import type { ICrmAnalyticsService } from './crm-analytics.service'

export class CrmAnalyticsApiClient implements ICrmAnalyticsService {
  constructor(private readonly http: AxiosInstance) {}

  async dashboard(query?: CrmDashboardQuery): Promise<CrmDashboardDto> {
    return (await this.http.get<CrmDashboardDto>('/contacts/crm/dashboard', { params: query })).data
  }
}
