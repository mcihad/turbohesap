import type { ModuleStatsDto, StatsQuery } from './report.dto'

// Contract for per-module analytics (/api/reports/<module>). Each returns the
// same generic ModuleStatsDto, gated by the matching reports.<module> permission.
export interface IReportsService {
  overview(query?: StatsQuery): Promise<ModuleStatsDto>
  pos(query?: StatsQuery): Promise<ModuleStatsDto>
  inventory(query?: StatsQuery): Promise<ModuleStatsDto>
  finance(query?: StatsQuery): Promise<ModuleStatsDto>
  invoices(query?: StatsQuery): Promise<ModuleStatsDto>
  contacts(query?: StatsQuery): Promise<ModuleStatsDto>
  sales(query?: StatsQuery): Promise<ModuleStatsDto>
}
