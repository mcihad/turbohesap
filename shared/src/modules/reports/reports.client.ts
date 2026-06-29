import type { AxiosInstance } from 'axios'

import type { ModuleStatsDto, StatsQuery } from './report.dto'
import type { IReportsService } from './reports.service'

const base = '/reports'

// Methods are bound arrow properties so they keep `this` even when passed as a
// bare reference (e.g. `fetcher={api.reports.pos}`); a regular method would lose
// `this` and throw "Cannot read properties of undefined".
export class ReportsApiClient implements IReportsService {
  constructor(private readonly http: AxiosInstance) {}

  private get(module: string, query?: StatsQuery): Promise<ModuleStatsDto> {
    return this.http
      .get<ModuleStatsDto>(`${base}/${module}`, { params: query })
      .then((r) => r.data)
  }

  overview = (query?: StatsQuery): Promise<ModuleStatsDto> => this.get('overview', query)
  pos = (query?: StatsQuery): Promise<ModuleStatsDto> => this.get('pos', query)
  inventory = (query?: StatsQuery): Promise<ModuleStatsDto> => this.get('inventory', query)
  finance = (query?: StatsQuery): Promise<ModuleStatsDto> => this.get('finance', query)
  invoices = (query?: StatsQuery): Promise<ModuleStatsDto> => this.get('invoices', query)
  contacts = (query?: StatsQuery): Promise<ModuleStatsDto> => this.get('contacts', query)
  sales = (query?: StatsQuery): Promise<ModuleStatsDto> => this.get('sales', query)
}
