// Kartlı geçiş (card-access / PDKS) — settings + a vendor-neutral import standard.
// A `CardSource` is a configured device/system; `AccessEvent` is the normalized
// event shape third-party systems send; `EmployeeCard` maps a card number to an
// employee. Today import is an authenticated batch endpoint; a public HTTP ingest
// server (using `apiKey`) can be added later on the same standard.

export interface CardSourceDto {
  id: string
  name: string
  code: string
  kind: string // 'zkteco_adms' | 'generic' | ...
  description: string | null
  config: Record<string, unknown>
  timezone: string
  /** Vendor direction value → our direction (e.g. {"0":"in","1":"out"}). */
  directionMapping: Record<string, AccessDirection>
  /** Whether an API key is set (the value itself is masked, never returned). */
  hasApiKey: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCardSourceRequest {
  name: string
  code?: string
  kind?: string
  description?: string | null
  config?: Record<string, unknown>
  timezone?: string
  directionMapping?: Record<string, AccessDirection>
  /** Set/replace the API key (omit or empty to keep the existing one). */
  apiKey?: string
  isActive?: boolean
}

export type UpdateCardSourceRequest = Partial<CreateCardSourceRequest>

// ── Employee card mapping ─────────────────────────────────────────────────────

export interface EmployeeCardDto {
  id: string
  employeeId: string
  employeeName: string
  cardNo: string
  externalPersonnelId: string | null
  validFrom: string | null
  validTo: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateEmployeeCardRequest {
  employeeId: string
  cardNo: string
  externalPersonnelId?: string | null
  validFrom?: string | null
  validTo?: string | null
  isActive?: boolean
}

export type UpdateEmployeeCardRequest = Partial<
  Omit<CreateEmployeeCardRequest, 'employeeId'>
>

export interface EmployeeCardListQuery {
  employeeId?: string
  cardNo?: string
}

// ── Import standard (vendor-neutral) ──────────────────────────────────────────

export type AccessDirection = 'in' | 'out' | 'unknown'
export type AccessEventType =
  | 'attendance'
  | 'access_granted'
  | 'access_denied'
  | 'door'

// One normalized access event. `externalId` is the idempotency key (per source);
// if absent the server derives one from deviceId+cardNo+eventTime+direction.
export interface AccessEvent {
  externalId?: string
  /** Printed decimal card number — string to keep leading zeros. */
  cardNo?: string
  /** Vendor user/PIN, used when cards map by personnel id. */
  personnelId?: string
  /** Explicit mapping hint. */
  employeeRef?: {
    byCardNo?: string
    byExternalPersonnelId?: string
    byTcKimlik?: string
  }
  deviceId: string
  terminalId?: string
  gateId?: string
  readerId?: string
  direction?: AccessDirection
  /** ISO 8601 with offset, e.g. 2026-06-30T08:03:12+03:00. */
  eventTime: string
  eventType?: AccessEventType
  verifyMode?: string
  raw?: Record<string, unknown>
}

export interface AttendanceImportRequest {
  /** Card source code (resolves device config + timezone). */
  source: string
  deviceId?: string
  events: AccessEvent[]
}

export interface AttendanceImportError {
  index: number
  externalId: string | null
  reason: string
}

export interface AttendanceImportResultDto {
  received: number
  inserted: number
  duplicates: number
  /** Inserted but with employeeId unresolved → flagged for admin. */
  unmatched: number
  rejected: number
  errors: AttendanceImportError[]
}
