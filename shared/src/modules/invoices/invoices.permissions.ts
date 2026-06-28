// Permission keys for the Invoices (Fatura) module.
export const InvoicesPermissions = {
  read: 'invoices.invoices.read',
  write: 'invoices.invoices.write',
} as const

export type InvoicesPermission =
  (typeof InvoicesPermissions)[keyof typeof InvoicesPermissions]
