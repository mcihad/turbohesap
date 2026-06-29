// Bordro (Türkiye payroll). Parameters (rates / brackets / minimum wage) are
// versioned BY YEAR in a dedicated param set so they can be updated as the law
// changes, without touching the calculation engine (`bordro.helpers.ts`).

export interface GelirVergisiDilim {
  /** Upper bound of this bracket (cumulative yearly GV matrahı), TL. The top
   *  bracket uses a very large `ust` (effectively no upper bound). */
  ust: number
  /** Marginal rate as a fraction, e.g. 0.15. */
  oran: number
}

export interface PayrollParams {
  /** Aylık brüt asgari ücret (TL). */
  asgariUcretBrut: number
  /** SGK prime base lower/upper bounds (monthly). taban = asgari brüt, tavan = 7.5×. */
  sgkTaban: number
  sgkTavan: number
  // Employee deductions (fractions)
  sgkIsciOran: number // 0.14
  issizlikIsciOran: number // 0.01
  // Employer cost (fractions)
  sgkIsverenOran: number // 0.205 (or 0.155 with the 5-point teşvik)
  issizlikIsverenOran: number // 0.02
  /** Cumulative income-tax brackets (ücret), ascending by `ust`. */
  gelirVergisiDilimleri: GelirVergisiDilim[]
  /** Damga vergisi oranı (binde 7,59 → 0.00759). */
  damgaOran: number
  /** Monthly minimum-wage income-tax exemption (asgari ücret gelir vergisi
   *  istisnası) — subtracted from every employee's income tax. */
  asgariUcretGvIstisna: number
  /** Monthly minimum-wage stamp-tax exemption. */
  asgariUcretDamgaIstisna: number
}

export interface PayrollParamSetDto {
  id: string
  year: number
  params: PayrollParams
  createdAt: string
  updatedAt: string
}
export interface UpsertPayrollParamsRequest {
  year: number
  params: PayrollParams
}

// ── computed payslip breakdown (also the engine's output shape) ──
export interface PayslipBreakdown {
  /** Effective brüt for the period (monthly brüt × days/30). */
  brut: number
  days: number
  sgkMatrah: number
  sgkIsci: number
  issizlikIsci: number
  gvMatrah: number
  /** Cumulative GV matrahı BEFORE this payslip (for bracket selection). */
  kumulatifMatrahOnce: number
  gelirVergisi: number
  damga: number
  gvIstisna: number
  damgaIstisna: number
  /** Net pay = brüt − sgkİşçi − işsizlikİşçi − (gelirVergisi−istisna) − (damga−istisna). */
  net: number
  // employer cost
  sgkIsveren: number
  issizlikIsveren: number
  isverenMaliyet: number
}

export type PayrollRunStatus = 'draft' | 'finalized' | 'paid'
export const PAYROLL_RUN_STATUSES: PayrollRunStatus[] = ['draft', 'finalized', 'paid']
export const PAYROLL_RUN_STATUS_LABELS: Record<PayrollRunStatus, string> = {
  draft: 'Taslak',
  finalized: 'Kesinleşti',
  paid: 'Ödendi',
}

export interface PayrollRunDto {
  id: string
  year: number
  month: number
  status: PayrollRunStatus
  branchId: string | null
  /** COMPUTED. */
  payslipCount: number
  totalNet: number
  totalCost: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PayslipDto extends PayslipBreakdown {
  id: string
  runId: string
  employeeId: string
  employeeName: string
  year: number
  month: number
  /** Finance transaction that paid this slip (null until paid). */
  financeTransactionId: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatePayrollRunRequest {
  year: number
  month: number
  branchId?: string | null
  notes?: string | null
}
/** (Re)compute payslips for a run from employees' salaries + timesheets. */
export interface ComputePayrollRequest {
  employeeIds?: string[]
}
export interface PayPayslipRequest {
  cashAccountId?: string | null
  bankAccountId?: string | null
  date?: string
}
export interface PayrollRunListQuery {
  year?: number
  status?: PayrollRunStatus
  branchId?: string
}
