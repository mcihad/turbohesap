import type { Page } from '../../core/pagination'
import type {
  ErrorLogDto,
  ErrorLogQuery,
  ReportClientErrorRequest,
  UpdateErrorLogRequest,
} from './error-log.dto'

// Contract for the error log resource (/api/iam/error-logs). Server errors are
// written by the global exception filter; clients report via report() (public).
// Reads/triage edits require permissions; report() does not (errors may happen
// while signed out).
export interface IErrorLogsService {
  list(query?: ErrorLogQuery): Promise<Page<ErrorLogDto>>
  get(id: string): Promise<ErrorLogDto>
  /** Update triage status / developer notes. */
  update(id: string, input: UpdateErrorLogRequest): Promise<ErrorLogDto>
  /** Delete an error log (needs `iam.errors.delete`). */
  remove(id: string): Promise<void>
  /** Report a client-side error (no auth required). */
  report(input: ReportClientErrorRequest): Promise<void>
}
