import { FileText, LayoutDashboard } from 'lucide-react'

import { InvoicesPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

export const invoicesModule: AppModule = {
  key: 'invoices',
  label: 'Fatura',
  icon: FileText,
  home: '/invoices',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/invoices', exact: true },
        {
          title: 'Faturalar',
          icon: FileText,
          to: '/invoices/invoices',
          keywords: ['fatura', 'invoice', 'satış', 'alış', 'kdv'],
          permission: InvoicesPermissions.read,
        },
      ],
    },
  ],
}
