// Giriş/çıkış kaydı (attendance record) — one table for all sources: mobile GPS
// check-in, imported card events, web/manual entries. `status` is valid/flagged/
// rejected with a `flagReason` so admins can review. (Puantaj reconciliation is a
// later step — these are raw records for now.)
import type { CheckinAreaSummary } from './checkin-area.dto'

export type AttendanceDirection = 'in' | 'out' | 'unknown'
export type AttendanceMethod = 'mobile_gps' | 'card' | 'web' | 'manual'
export type AttendanceStatus = 'valid' | 'flagged' | 'rejected'

export const ATTENDANCE_DIRECTION_LABELS: Record<AttendanceDirection, string> = {
  in: 'Giriş',
  out: 'Çıkış',
  unknown: 'Belirsiz',
}
export const ATTENDANCE_METHOD_LABELS: Record<AttendanceMethod, string> = {
  mobile_gps: 'Mobil (GPS)',
  card: 'Kart',
  web: 'Web',
  manual: 'Elle',
}
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  valid: 'Geçerli',
  flagged: 'İşaretli',
  rejected: 'Reddedildi',
}

export interface AttendanceRecordDto {
  id: string
  employeeId: string | null
  employeeName: string | null
  branchId: string | null
  eventTime: string
  direction: AttendanceDirection
  method: AttendanceMethod
  lat: number | null
  lng: number | null
  accuracyMeters: number | null
  areaId: string | null
  area: CheckinAreaSummary | null
  distanceMeters: number | null
  withinGeofence: boolean
  withinTimeWindow: boolean
  isMockLocation: boolean
  status: AttendanceStatus
  flagReason: string | null
  cardNo: string | null
  source: string | null
  externalId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Mobile self check-in/out (the device sends its GPS fix; the server validates
// against the employee's allowed areas + time windows + tolerance).
export interface CheckinRequest {
  direction: AttendanceDirection
  lat: number
  lng: number
  accuracyMeters?: number
  isMockLocation?: boolean
  deviceInfo?: Record<string, unknown>
  notes?: string | null
}

// Result returned to the device after a check-in.
export interface CheckinResultDto {
  record: AttendanceRecordDto
  /** True when the check-in landed inside an allowed area + time window. */
  accepted: boolean
  message: string
}

// Manual/web entry by an admin.
export interface CreateAttendanceRequest {
  employeeId: string
  eventTime: string
  direction: AttendanceDirection
  method?: AttendanceMethod
  lat?: number | null
  lng?: number | null
  areaId?: string | null
  notes?: string | null
}

export type UpdateAttendanceRequest = Partial<
  Omit<CreateAttendanceRequest, 'employeeId'>
>

export interface AttendanceListQuery {
  employeeId?: string
  branchId?: string
  method?: AttendanceMethod
  status?: AttendanceStatus
  direction?: AttendanceDirection
  from?: string
  to?: string
}
