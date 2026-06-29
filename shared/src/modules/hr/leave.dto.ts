// İzin (leave) — types (yıllık, ücretsiz, hastalık…), requests with an approval
// workflow, and a computed per-year balance (entitlement − used annual days).

export interface LeaveTypeDto {
  id: string
  name: string
  /** Paid leave (counts as a worked day for payroll). */
  paid: boolean
  /** Deducts from the annual paid-leave balance (yıllık izin). */
  affectsAnnualBalance: boolean
  isActive: boolean
  sortOrder: number
}
export interface CreateLeaveTypeRequest {
  name: string
  paid?: boolean
  affectsAnnualBalance?: boolean
  isActive?: boolean
  sortOrder?: number
}
export type UpdateLeaveTypeRequest = Partial<CreateLeaveTypeRequest>

export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export const LEAVE_STATUSES: LeaveStatus[] = ['pending', 'approved', 'rejected']
export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
}

export interface LeaveRequestDto {
  id: string
  employeeId: string
  employeeName: string
  leaveTypeId: string
  leaveTypeName: string
  startDate: string
  endDate: string
  /** Number of leave days (inclusive). */
  days: number
  reason: string | null
  status: LeaveStatus
  approvedById: string | null
  approvedByName: string | null
  createdAt: string
  updatedAt: string
}
export interface CreateLeaveRequestRequest {
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  days?: number
  reason?: string | null
}
export type UpdateLeaveRequestRequest = Partial<Omit<CreateLeaveRequestRequest, 'employeeId'>>

export interface LeaveRequestListQuery {
  employeeId?: string
  status?: LeaveStatus
  from?: string
  to?: string
}

export interface LeaveBalanceDto {
  employeeId: string
  year: number
  entitlement: number
  used: number
  pending: number
  remaining: number
}
