import { CreditCard, Landmark, Receipt, Wallet, LayoutDashboard } from 'lucide-react'

import { FinancePermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

export const financeModule: AppModule = {
  key: 'finance',
  label: 'Finans',
  icon: Landmark,
  home: '/finance',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/finance', exact: true },
        {
          title: 'Kasa Hesapları',
          icon: Wallet,
          to: '/finance/cash-accounts',
          keywords: ['kasa', 'nakit', 'cash', 'account'],
          permission: FinancePermissions.cashAccountsRead,
        },
        {
          title: 'Banka Hesapları',
          icon: CreditCard,
          to: '/finance/bank-accounts',
          keywords: ['banka', 'hesap', 'bank', 'iban', 'account'],
          permission: FinancePermissions.bankAccountsRead,
        },
        {
          title: 'Çek/Senet',
          icon: Receipt,
          to: '/finance/instruments',
          keywords: ['çek', 'senet', 'check', 'note', 'portföy', 'tahsilat', 'ödeme'],
          permission: FinancePermissions.instrumentsRead,
        },
      ],
    },
  ],
}
