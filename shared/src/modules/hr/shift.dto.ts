// Vardiya tanımı (shift definition) — a reusable shift template. Breaks (mola) are
// stored inline as a small jsonb array. `crossesMidnight` marks a gece vardiyası
// whose end time is on the next calendar day. `isDayOff` is a pseudo-shift
// (OFF / Haftalık İzin) so rotations can carry off-days as slots.

export interface ShiftBreak {
  /** Minutes after shift start when the break begins. */
  startOffsetMin: number
  durationMin: number
  /** Paid (rest/çay) vs unpaid (yemek) — unpaid is deducted from worked time. */
  paid: boolean
  label: string
}

export interface ShiftDto {
  id: string
  name: string
  code: string
  /** "HH:MM" local time. */
  startTime: string
  endTime: string
  /** True when endTime is on the next day (gece vardiyası). */
  crossesMidnight: boolean
  /** Expected net working minutes (after unpaid breaks). */
  expectedMinutes: number
  /** Geç kalma toleransı — minutes after start still counted on-time. */
  lateGraceMin: number
  /** Erken çıkış toleransı — minutes before end still counted full. */
  earlyLeaveGraceMin: number
  /** Erken giriş kırpma — minutes before start that count as worked (clamp). */
  earlyInClampMin: number
  color: string
  /** A pseudo "off" shift used as a rotation slot. */
  isDayOff: boolean
  breaks: ShiftBreak[]
  branchId: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ShiftSummary {
  id: string
  name: string
  code: string
  startTime: string
  endTime: string
  color: string
  isDayOff: boolean
}

export interface CreateShiftRequest {
  name: string
  code?: string
  startTime: string
  endTime: string
  crossesMidnight?: boolean
  expectedMinutes?: number
  lateGraceMin?: number
  earlyLeaveGraceMin?: number
  earlyInClampMin?: number
  color?: string
  isDayOff?: boolean
  breaks?: ShiftBreak[]
  branchId?: string | null
  isActive?: boolean
  notes?: string | null
}

export type UpdateShiftRequest = Partial<CreateShiftRequest>

export interface ShiftListQuery {
  branchId?: string
  isActive?: boolean
}
