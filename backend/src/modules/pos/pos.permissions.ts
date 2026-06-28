import { PosPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

export const POS_PERMISSION_DEFS: PermissionDef[] = [
  { key: PosPermissions.registersRead, description: 'POS kasalarını görüntüleme', group: 'POS' },
  { key: PosPermissions.registersWrite, description: 'POS kasası ekleme/düzenleme', group: 'POS' },
  { key: PosPermissions.sell, description: 'Satış ekranını kullanma ve satış oluşturma', group: 'POS' },
  { key: PosPermissions.sessionOpen, description: 'Vardiya açma', group: 'POS' },
  { key: PosPermissions.sessionClose, description: 'Vardiya kapatma (X/Z)', group: 'POS' },
  { key: PosPermissions.discountLine, description: 'Satır indirimi uygulama', group: 'POS' },
  { key: PosPermissions.discountOverride, description: 'Limit üstü indirim', group: 'POS' },
  { key: PosPermissions.priceOverride, description: 'Fiyat değiştirme', group: 'POS' },
  { key: PosPermissions.refund, description: 'İade', group: 'POS' },
  { key: PosPermissions.void, description: 'Satış/satır iptali', group: 'POS' },
  { key: PosPermissions.drawerOpen, description: 'Çekmece açma (satışsız)', group: 'POS' },
  { key: PosPermissions.reprint, description: 'Fiş yeniden yazdırma', group: 'POS' },
  { key: PosPermissions.reports, description: 'POS raporları', group: 'POS' },
  { key: PosPermissions.kitchenView, description: 'Mutfak ekranını görüntüleme', group: 'POS' },
  { key: PosPermissions.kitchenBump, description: 'Mutfak siparişi ilerletme', group: 'POS' },
  { key: PosPermissions.tablesManage, description: 'Masa yönetimi', group: 'POS' },
  { key: PosPermissions.settings, description: 'POS ayarları', group: 'POS' },
  { key: PosPermissions.usersPin, description: 'Kullanıcı POS PIN yönetimi', group: 'POS' },
]
