import { ReportsPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

// Per-module analytics view permissions. Each report page can be toggled
// independently per role/user. Auto-upserted on boot via permissions.catalog.
export const REPORTS_PERMISSION_DEFS: PermissionDef[] = [
  { key: ReportsPermissions.overview, description: 'Genel rapor özetini görüntüleme', group: 'reports' },
  { key: ReportsPermissions.pos, description: 'POS raporlarını görüntüleme', group: 'reports' },
  { key: ReportsPermissions.inventory, description: 'Stok raporlarını görüntüleme', group: 'reports' },
  { key: ReportsPermissions.finance, description: 'Finans raporlarını görüntüleme', group: 'reports' },
  { key: ReportsPermissions.invoices, description: 'Fatura raporlarını görüntüleme', group: 'reports' },
  { key: ReportsPermissions.contacts, description: 'Cari/CRM raporlarını görüntüleme', group: 'reports' },
  { key: ReportsPermissions.sales, description: 'Satış kanalı raporlarını görüntüleme', group: 'reports' },
]
