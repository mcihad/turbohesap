// Per-module analytics view permissions — each module's report page can be
// toggled independently per role/user.
export const ReportsPermissions = {
  overview: 'reports.overview',
  pos: 'reports.pos',
  inventory: 'reports.inventory',
  finance: 'reports.finance',
  invoices: 'reports.invoices',
  contacts: 'reports.contacts',
  sales: 'reports.sales',
} as const

export type ReportsPermission = (typeof ReportsPermissions)[keyof typeof ReportsPermissions]
