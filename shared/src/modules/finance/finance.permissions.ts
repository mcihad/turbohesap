// Permission keys for the Finance module
export const FinancePermissions = {
  cashAccountsRead: 'finance.cashAccounts.read',
  cashAccountsWrite: 'finance.cashAccounts.write',
  bankAccountsRead: 'finance.bankAccounts.read',
  bankAccountsWrite: 'finance.bankAccounts.write',
  transactionsRead: 'finance.transactions.read',
  transactionsWrite: 'finance.transactions.write',
  /** Çek/Senet: list/get. */
  instrumentsRead: 'finance.instruments.read',
  /** Çek/Senet: create + edit-while-open. */
  instrumentsWrite: 'finance.instruments.write',
  /** Çek/Senet: collect/pay/reverse — the ledger-posting actions. */
  instrumentsSettle: 'finance.instruments.settle',
  /** Çek/Senet: deposit-for-collection/bounce/endorse/pledge/cancel. */
  instrumentsStatus: 'finance.instruments.status',
  /** Çek/Senet: delete-while-open. */
  instrumentsDelete: 'finance.instruments.delete',
} as const

export type FinancePermission = (typeof FinancePermissions)[keyof typeof FinancePermissions]
