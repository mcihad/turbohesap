import { HrPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

export const HR_PERMISSION_DEFS: PermissionDef[] = [
  { key: HrPermissions.read, description: 'İK & Bordro kayıtlarını görüntüleme (personel/izin/puantaj/bordro)', group: 'hr' },
  { key: HrPermissions.write, description: 'Personel, izin ve puantaj kaydı oluşturma/düzenleme', group: 'hr' },
  { key: HrPermissions.payroll, description: 'Bordro dönemi oluşturma, hesaplama ve kesinleştirme', group: 'hr' },
  { key: HrPermissions.pay, description: 'Maaş ödemesini kasaya/bankaya işleme', group: 'hr' },
  { key: HrPermissions.approve, description: 'İzin taleplerini onaylama / reddetme', group: 'hr' },
  { key: HrPermissions.params, description: 'Yıllık bordro parametrelerini düzenleme (oran/dilim/asgari ücret)', group: 'hr' },
  // PDKS — vardiya / giriş-çıkış / kartlı geçiş
  { key: HrPermissions.shiftsRead, description: 'Vardiya tanımları, rotasyon ve takvimi görüntüleme', group: 'İK-PDKS' },
  { key: HrPermissions.shiftsWrite, description: 'Vardiya tanımı ve rotasyon oluşturma/düzenleme', group: 'İK-PDKS' },
  { key: HrPermissions.shiftsAssign, description: 'Personele vardiya atama ve takvim düzenleme', group: 'İK-PDKS' },
  { key: HrPermissions.areasRead, description: 'Giriş alanlarını (geofence) görüntüleme', group: 'İK-PDKS' },
  { key: HrPermissions.areasWrite, description: 'Giriş alanı geometrisi ve ayarlarını düzenleme', group: 'İK-PDKS' },
  { key: HrPermissions.areasAssign, description: 'Personellere giriş alanı atama', group: 'İK-PDKS' },
  { key: HrPermissions.attendanceRead, description: 'Giriş/çıkış kayıtlarını görüntüleme', group: 'İK-PDKS' },
  { key: HrPermissions.attendanceCheckin, description: 'Mobil uygulamadan kendi giriş/çıkışını yapma', group: 'İK-PDKS' },
  { key: HrPermissions.attendanceManage, description: 'Giriş/çıkış kaydı elle ekleme/düzenleme/silme', group: 'İK-PDKS' },
  { key: HrPermissions.cardsRead, description: 'Kartlı geçiş kaynaklarını ve personel kartlarını görüntüleme', group: 'İK-PDKS' },
  { key: HrPermissions.cardsWrite, description: 'Kartlı geçiş ayarları ve personel kart eşlemesi düzenleme', group: 'İK-PDKS' },
  { key: HrPermissions.cardsImport, description: 'Kartlı geçiş verilerini içe aktarma', group: 'İK-PDKS' },
]
