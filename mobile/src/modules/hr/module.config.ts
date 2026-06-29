import { HrPermissions } from '@turbohesap/shared'
import type { MobileModule } from '../types'

// İK & Bordro — personel kayıtları, izin onayları, aylık puantaj ve Türkiye
// uyumlu bordro (maaş pusulası). Each item drills into its own screen; payroll
// + payslip detail screens are reached from within the run list.
export const hrModule: MobileModule = {
  key: 'hr',
  label: 'İK & Bordro',
  icon: 'users',
  home: 'hr.home',
  permission: HrPermissions.read,
  items: [
    {
      key: 'hr.employees',
      title: 'Personel',
      icon: 'user',
      description: 'Çalışan kayıtları ve maaş bilgileri',
      permission: HrPermissions.read,
    },
    {
      key: 'hr.leaves',
      title: 'İzinler',
      icon: 'calendar',
      description: 'İzin talepleri ve onaylar',
      permission: HrPermissions.read,
    },
    {
      key: 'hr.timesheets',
      title: 'Puantaj',
      icon: 'clock',
      description: 'Aylık çalışma günleri',
      permission: HrPermissions.read,
    },
    {
      key: 'hr.payroll',
      title: 'Bordro',
      icon: 'dollar-sign',
      description: 'Maaş hesaplama ve ödemeler',
      permission: HrPermissions.read,
    },
  ],
}
