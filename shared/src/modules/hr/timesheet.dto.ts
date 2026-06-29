// Puantaj (timesheet) — one row per employee per month, feeding payroll's day
// count. `workedDays` (+ paid leave) is the basis for the period brüt.

export interface TimesheetDto {
  id: string
  employeeId: string
  employeeName: string
  year: number
  month: number
  workedDays: number
  weekendDays: number
  holidayDays: number
  overtimeHours: number
  absentDays: number
  paidLeaveDays: number
  unpaidLeaveDays: number
  /** COMPUTED: workedDays + paidLeaveDays (payroll day basis, capped at 30). */
  payrollDays: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertTimesheetRequest {
  employeeId: string
  year: number
  month: number
  workedDays: number
  weekendDays?: number
  holidayDays?: number
  overtimeHours?: number
  absentDays?: number
  paidLeaveDays?: number
  unpaidLeaveDays?: number
  notes?: string | null
}

export interface TimesheetListQuery {
  year?: number
  month?: number
  employeeId?: string
}
