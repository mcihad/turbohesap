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
      key: 'hr.checkin',
      title: 'Giriş/Çıkış',
      icon: 'log-in',
      description: 'Konumla giriş/çıkış',
      permission: HrPermissions.attendanceCheckin,
    },
    {
      key: 'hr.myschedule',
      title: 'Vardiyalarım',
      icon: 'calendar',
      description: 'Vardiya takvimim',
      permission: HrPermissions.attendanceCheckin,
    },
    {
      key: 'hr.shifts',
      title: 'Vardiyalar',
      icon: 'clock',
      description: 'Vardiya tanımları (mola, tolerans)',
      permission: HrPermissions.shiftsRead,
    },
    {
      key: 'hr.rotations',
      title: 'Rotasyonlar',
      icon: 'repeat',
      description: 'Vardiya döngü şablonları',
      permission: HrPermissions.shiftsRead,
    },
    {
      key: 'hr.schedule',
      title: 'Vardiya Takvimi',
      icon: 'calendar',
      description: 'Personele atama ve takvim oluşturma',
      permission: HrPermissions.shiftsRead,
    },
    {
      key: 'hr.areas',
      title: 'Giriş Alanları',
      icon: 'map-pin',
      description: 'Geofence alanları (harita)',
      permission: HrPermissions.areasRead,
    },
    {
      key: 'hr.attendance',
      title: 'Giriş/Çıkış Kayıtları',
      icon: 'list',
      description: 'Devam kayıtları ve manuel giriş',
      permission: HrPermissions.attendanceRead,
    },
    {
      key: 'hr.cards',
      title: 'Kartlı Geçiş',
      icon: 'credit-card',
      description: 'Kart kaynakları, kartlar ve içe aktarma',
      permission: HrPermissions.cardsRead,
    },
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
