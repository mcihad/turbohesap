import { ProductionPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

export const PRODUCTION_PERMISSION_DEFS: PermissionDef[] = [
  { key: ProductionPermissions.read, description: 'Üretim kayıtlarını görüntüleme (reçete/iş merkezi/üretim emri)', group: 'Üretim' },
  { key: ProductionPermissions.write, description: 'Reçete (BOM) ve iş merkezi oluşturma/düzenleme', group: 'Üretim' },
  { key: ProductionPermissions.ordersWrite, description: 'Üretim emri oluşturma/düzenleme', group: 'Üretim' },
  { key: ProductionPermissions.ordersConfirm, description: 'Üretim emrini onaylama (patlatma + rezervasyon)', group: 'Üretim' },
  { key: ProductionPermissions.ordersComplete, description: 'Üretim emrini tamamlama (tüketim + mamul girişi)', group: 'Üretim' },
  { key: ProductionPermissions.ordersCancel, description: 'Üretim emrini iptal etme (stok geri alma)', group: 'Üretim' },
  { key: ProductionPermissions.workordersExecute, description: 'Saha: iş emri başlat/duraklat/bitir, miktar/fire bildir', group: 'Üretim' },
  { key: ProductionPermissions.subcontractManage, description: 'Fason sevk/dönüş yönetimi', group: 'Üretim' },
  { key: ProductionPermissions.planningRun, description: 'MRP/planlama çalıştırma', group: 'Üretim' },
  { key: ProductionPermissions.qualityManage, description: 'Kalite kontrol ve parti/seri yönetimi', group: 'Üretim' },
]
