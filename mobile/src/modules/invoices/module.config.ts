import { InvoicesPermissions } from '@turbohesap/shared'
import type { MobileModule } from '../types'

export const invoicesModule: MobileModule = {
  key: 'invoices',
  label: 'Fatura',
  icon: 'file-text',
  home: 'invoices.home',
  permission: InvoicesPermissions.read,
  items: [
    {
      key: 'invoices.invoices',
      title: 'Faturalar',
      icon: 'file-text',
      description: 'Satış ve alış faturaları',
      permission: InvoicesPermissions.read,
    },
  ],
}
