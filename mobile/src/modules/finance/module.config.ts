import { FinancePermissions } from '@turbohesap/shared'
import type { MobileModule } from '../types'

export const financeModule: MobileModule = {
  key: 'finance',
  label: 'Finans',
  icon: 'credit-card',
  home: 'finance.home',
  permission: FinancePermissions.cashAccountsRead,
  items: [
    {
      key: 'finance.cash-accounts',
      title: 'Kasa Hesapları',
      icon: 'credit-card',
      description: 'Nakit kasalar',
      permission: FinancePermissions.cashAccountsRead,
    },
    {
      key: 'finance.bank-accounts',
      title: 'Banka Hesapları',
      icon: 'dollar-sign',
      description: 'Banka cari hesapları',
      permission: FinancePermissions.bankAccountsRead,
    },
  ],
}
