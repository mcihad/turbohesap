// Personel (employee) — distinct from contacts (a customer/supplier). Optionally
// linked to an iam User (`userId`) when the person also has an app login.

export type EmploymentType = 'full_time' | 'part_time' | 'temporary'
export const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'temporary']
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Tam zamanlı',
  part_time: 'Yarı zamanlı',
  temporary: 'Geçici',
}

/** SGK durumu — drives employer-incentive rate choices later. */
export type SgkStatus = 'normal' | 'emekli' | 'genc_tesvik' | 'engelli'
export const SGK_STATUSES: SgkStatus[] = ['normal', 'emekli', 'genc_tesvik', 'engelli']
export const SGK_STATUS_LABELS: Record<SgkStatus, string> = {
  normal: 'Normal',
  emekli: 'Emekli (SGDP)',
  genc_tesvik: 'Genç/Teşvik',
  engelli: 'Engelli',
}

export type SalaryType = 'gross' | 'net'
export const SALARY_TYPES: SalaryType[] = ['gross', 'net']
export const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  gross: 'Brüt',
  net: 'Net',
}

export interface EmployeeDto {
  id: string
  firstName: string
  lastName: string
  fullName: string
  tcKimlikNo: string
  birthDate: string | null
  hireDate: string
  terminationDate: string | null
  departmentKey: string | null
  positionKey: string | null
  employmentType: EmploymentType
  salaryType: SalaryType
  salaryAmount: number
  sgkSicilNo: string | null
  sgkStatus: SgkStatus
  iban: string | null
  bankName: string | null
  phone: string | null
  email: string | null
  address: string | null
  branchId: string | null
  /** Optional link to an iam User (login). */
  userId: string | null
  /** Annual paid-leave entitlement in days. */
  annualLeaveDays: number
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateEmployeeRequest {
  firstName: string
  lastName: string
  tcKimlikNo?: string
  birthDate?: string | null
  hireDate: string
  terminationDate?: string | null
  departmentKey?: string | null
  positionKey?: string | null
  employmentType?: EmploymentType
  salaryType?: SalaryType
  salaryAmount: number
  sgkSicilNo?: string | null
  sgkStatus?: SgkStatus
  iban?: string | null
  bankName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  branchId?: string | null
  userId?: string | null
  annualLeaveDays?: number
  isActive?: boolean
  notes?: string | null
}
export type UpdateEmployeeRequest = Partial<CreateEmployeeRequest>

export interface EmployeeListQuery {
  search?: string
  departmentKey?: string
  branchId?: string
  isActive?: boolean
}
