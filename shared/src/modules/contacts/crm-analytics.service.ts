import type { CrmDashboardDto, CrmDashboardQuery } from './crm-analytics.dto'

export interface ICrmAnalyticsService {
  dashboard(query?: CrmDashboardQuery): Promise<CrmDashboardDto>
}
