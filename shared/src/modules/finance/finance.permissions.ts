// Permission keys for the Finance module
export const FinancePermissions = {
  cashAccountsRead: 'finance.cashAccounts.read',
  cashAccountsWrite: 'finance.cashAccounts.write',
  bankAccountsRead: 'finance.bankAccounts.read',
  bankAccountsWrite: 'finance.bankAccounts.write',
} as const

export type FinancePermission = (typeof FinancePermissions)[keyof typeof FinancePermissions]
