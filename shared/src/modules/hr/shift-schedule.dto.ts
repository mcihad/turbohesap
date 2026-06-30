// Vardiya takvimi (shift schedule) — two layers:
//  - EmployeeShiftAssignment: the RULE (employee follows rotation X at offset N, or
//    a fixed shift, over a date range).
//  - EmployeeShiftDay: the MATERIALIZED per-day calendar (UNIQUE per employee+date),
//    generated from rules and editable as manual overrides.
import type { ShiftSummary } from './shift.dto'

export type ShiftDaySource = 'rotation' | 'manual' | 'swap'
export type ShiftDayStatus = 'draft' | 'published'

export interface EmployeeShiftAssignmentDto {
  id: string
  employeeId: string
  employeeName: string
  rotationId: string | null
  rotationName: string | null
  /** Cycle offset (team placement) when following a rotation. */
  rotationOffset: number
  fixedShiftId: string | null
  fixedShift: ShiftSummary | null
  effectiveFrom: string
  effectiveTo: string | null
  createdAt: string
  updatedAt: string
}

export interface EmployeeShiftDayDto {
  id: string
  employeeId: string
  employeeName: string
  workDate: string
  /** Null = OFF (day off). */
  shiftId: string | null
  shift: ShiftSummary | null
  source: ShiftDaySource
  status: ShiftDayStatus
  createdAt: string
  updatedAt: string
}

export interface AssignEmployeeShiftRequest {
  employeeId: string
  /** Either a rotation (with offset) or a fixed shift. */
  rotationId?: string | null
  rotationOffset?: number
  fixedShiftId?: string | null
  effectiveFrom: string
  effectiveTo?: string | null
}

export type UpdateEmployeeShiftRequest = Partial<
  Omit<AssignEmployeeShiftRequest, 'employeeId'>
>

// Materialize per-day rows for one or more employees over a date range from their
// assignments (rotation/fixed). Existing manual overrides are preserved unless
// `overwriteManual` is set.
export interface GenerateScheduleRequest {
  employeeIds?: string[]
  from: string
  to: string
  overwriteManual?: boolean
  /** Mark generated days published instead of draft. */
  publish?: boolean
}

export interface SetShiftDayRequest {
  employeeId: string
  workDate: string
  shiftId: string | null
  status?: ShiftDayStatus
}

export interface ShiftAssignmentListQuery {
  employeeId?: string
  rotationId?: string
}

export interface ShiftDayListQuery {
  employeeId?: string
  from?: string
  to?: string
}

export interface GenerateScheduleResult {
  created: number
  updated: number
  skipped: number
}
