import { HrPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

export const HR_PERMISSION_DEFS: PermissionDef[] = [
  { key: HrPermissions.read, description: 'İK & Bordro kayıtlarını görüntüleme (personel/izin/puantaj/bordro)', group: 'hr' },
  { key: HrPermissions.write, description: 'Personel, izin ve puantaj kaydı oluşturma/düzenleme', group: 'hr' },
  { key: HrPermissions.payroll, description: 'Bordro dönemi oluşturma, hesaplama ve kesinleştirme', group: 'hr' },
  { key: HrPermissions.pay, description: 'Maaş ödemesini kasaya/bankaya işleme', group: 'hr' },
  { key: HrPermissions.approve, description: 'İzin taleplerini onaylama / reddetme', group: 'hr' },
  { key: HrPermissions.params, description: 'Yıllık bordro parametrelerini düzenleme (oran/dilim/asgari ücret)', group: 'hr' },
]
