// Vardiya rotasyonu / döngü şablonu (shift rotation pattern) — a cyclic day
// pattern that repeats from `anchorDate`. `days` lists one slot per cycle day
// (shiftId null = OFF). An employee is placed onto a rotation with an offset (team
// A/B/C), then the schedule is materialized into per-day rows.
import type { ShiftSummary } from './shift.dto'

export interface RotationDay {
  /** 0-based index within the cycle. */
  dayIndex: number
  /** Shift for this slot, or null for an OFF day. */
  shiftId: string | null
  /** Optional team label (A/B/C…). */
  teamLabel?: string | null
}

export interface ShiftRotationDto {
  id: string
  name: string
  cycleLengthDays: number
  /** Date the cycle's dayIndex 0 falls on (rotation phase anchor). */
  anchorDate: string
  days: RotationDay[]
  /** Resolved shift summaries referenced by `days` (for display). */
  shifts: ShiftSummary[]
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateShiftRotationRequest {
  name: string
  cycleLengthDays: number
  anchorDate: string
  days?: RotationDay[]
  description?: string | null
  isActive?: boolean
}

export type UpdateShiftRotationRequest = Partial<CreateShiftRotationRequest>
