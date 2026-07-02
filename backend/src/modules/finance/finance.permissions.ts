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
  {
    key: FinancePermissions.transactionsRead,
    description: 'Kasa/Banka hareketlerini görüntüle',
    group: 'Finans',
  },
  {
    key: FinancePermissions.transactionsWrite,
    description: 'Kasa/Banka hareketlerini düzenle',
    group: 'Finans',
  },
  {
    key: FinancePermissions.instrumentsRead,
    description: 'Çek/Senet portföyünü görüntüle',
    group: 'Çek/Senet',
  },
  {
    key: FinancePermissions.instrumentsWrite,
    description: 'Çek/Senet ekle ve düzenle (açık durumdayken)',
    group: 'Çek/Senet',
  },
  {
    key: FinancePermissions.instrumentsSettle,
    description: 'Çek/Senet tahsil et / öde / geri al',
    group: 'Çek/Senet',
  },
  {
    key: FinancePermissions.instrumentsStatus,
    description: 'Çek/Senet durumunu değiştir (tahsile ver, karşılıksız, ciro, teminat, iptal)',
    group: 'Çek/Senet',
  },
  {
    key: FinancePermissions.instrumentsDelete,
    description: 'Çek/Senet sil (açık durumdayken)',
    group: 'Çek/Senet',
  },
]
