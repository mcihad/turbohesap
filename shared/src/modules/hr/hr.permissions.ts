// İK & Bordro permission keys.
export const HrPermissions = {
  read: 'hr.read',
  write: 'hr.write',
  /** Create/compute/finalize payroll runs. */
  payroll: 'hr.payroll',
  /** Post salary payments to finance. */
  pay: 'hr.pay',
  /** Approve/reject leave requests. */
  approve: 'hr.approve',
  /** Edit yearly payroll parameters (rates/brackets/minimum wage). */
  params: 'hr.params',
} as const

export type HrPermission = (typeof HrPermissions)[keyof typeof HrPermissions]
