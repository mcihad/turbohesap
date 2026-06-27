import { FinancePermissions } from '@turbohesap/shared'
import type { PermissionDef } from '../../common/permission.types'

export const FINANCE_PERMISSION_DEFS: PermissionDef[] = [
  {
    key: FinancePermissions.cashAccountsRead,
    description: 'Kasa hesaplarını görüntüle',
    group: 'Finans',
  },
  {
    key: FinancePermissions.cashAccountsWrite,
    description: 'Kasa hesaplarını düzenle',
    group: 'Finans',
  },
  {
    key: FinancePermissions.bankAccountsRead,
    description: 'Banka hesaplarını görüntüle',
    group: 'Finans',
  },
  {
    key: FinancePermissions.bankAccountsWrite,
    description: 'Banka hesaplarını düzenle',
    group: 'Finans',
  },
]
