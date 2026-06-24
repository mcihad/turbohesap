import type { PageQuery } from '../../core/pagination'

// Where the error was captured: the server's global exception filter, or a
// browser/client reported via POST /api/iam/error-logs/client.
export type ErrorLogOrigin = 'server' | 'client'

// Triage state, editable by developers.
export type ErrorLogStatus = 'new' | 'investigating' | 'resolved' | 'ignored'

// One captured error. Repeats of the same fingerprint (hash) collapse into a
// single row whose occurrenceCount / lastSeenAt advance.
export interface ErrorLogDto {
  id: string
  /** Fingerprint (type + message + first stack frame) used to dedupe repeats. */
  hash: string
  origin: ErrorLogOrigin
  /** Owning app module key (first path segment for server errors). */
  module: string | null
  message: string
  exceptionType: string
  stackTrace: string | null
  source: string | null
  fileName: string | null
  lineNumber: number | null
  httpMethod: string | null
  path: string | null
  queryString: string | null
  statusCode: number
  ipAddress: string | null
  userAgent: string | null
  /** Request headers (server) as a key/value map. */
  headers: Record<string, string> | null
  userId: string | null
  userName: string | null
  status: ErrorLogStatus
  developerNotes: string | null
  occurrenceCount: number
  firstSeenAt: string
  lastSeenAt: string
}

// Filters for the error log list.
export interface ErrorLogQuery extends PageQuery {
  origin?: ErrorLogOrigin
  status?: ErrorLogStatus
  module?: string
  statusCode?: number
  /** Free-text match across message, type, path and user name. */
  search?: string
  /** ISO date-time bounds (inclusive) on lastSeenAt. */
  from?: string
  to?: string
}

// Triage edit: change status and/or developer notes.
export interface UpdateErrorLogRequest {
  status?: ErrorLogStatus
  developerNotes?: string
}

// Payload a browser/client posts when it catches an unhandled error.
export interface ReportClientErrorRequest {
  message: string
  exceptionType?: string
  stackTrace?: string
  source?: string
  fileName?: string
  lineNumber?: number
  /** Client route where it happened (e.g. window.location.pathname). */
  path?: string
  /** Owning app module key (first segment of the route), if resolvable. */
  module?: string
  userAgent?: string
}
