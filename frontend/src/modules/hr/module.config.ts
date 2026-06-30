import {
  BadgeDollarSign,
  CalendarClock,
  CalendarDays,
  Clock,
  CreditCard,
  Fingerprint,
  LayoutDashboard,
  MapPin,
  Settings2,
  Users,
} from 'lucide-react'

import { HrPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

export const hrModule: AppModule = {
  key: 'hr',
  label: 'İK & Bordro',
  icon: Users,
  home: '/hr',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/hr', exact: true },
        {
          title: 'Personel',
          icon: Users,
          to: '/hr/employees',
          keywords: ['personel', 'çalışan', 'employee', 'ik'],
          permission: HrPermissions.read,
        },
        {
          title: 'İzinler',
          icon: CalendarDays,
          to: '/hr/leaves',
          keywords: ['izin', 'leave', 'yıllık', 'tatil'],
          permission: HrPermissions.read,
        },
        {
          title: 'Puantaj',
          icon: CalendarClock,
          to: '/hr/timesheets',
          keywords: ['puantaj', 'timesheet', 'mesai', 'gün'],
          permission: HrPermissions.read,
        },
        {
          title: 'Bordro',
          icon: BadgeDollarSign,
          to: '/hr/payroll',
          keywords: ['bordro', 'payroll', 'maaş', 'pusula', 'ödeme'],
          permission: HrPermissions.read,
        },
        {
          title: 'Parametreler',
          icon: Settings2,
          to: '/hr/params',
          keywords: ['parametre', 'oran', 'asgari', 'vergi', 'sgk'],
          permission: HrPermissions.params,
        },
      ],
    },
    {
      label: 'PDKS',
      icon: Fingerprint,
      items: [
        {
          title: 'Vardiyalar',
          icon: Clock,
          to: '/hr/shifts',
          keywords: ['vardiya', 'shift', 'mesai', 'pdks'],
          permission: HrPermissions.shiftsRead,
        },
        {
          title: 'Rotasyonlar',
          icon: CalendarClock,
          to: '/hr/shift-rotations',
          keywords: ['rotasyon', 'rotation', 'döngü', 'vardiya'],
          permission: HrPermissions.shiftsRead,
        },
        {
          title: 'Vardiya Takvimi',
          icon: CalendarDays,
          to: '/hr/shift-schedule',
          keywords: ['takvim', 'schedule', 'atama', 'vardiya'],
          permission: HrPermissions.shiftsRead,
        },
        {
          title: 'Giriş Alanları',
          icon: MapPin,
          to: '/hr/checkin-areas',
          keywords: ['giriş alanı', 'geofence', 'harita', 'konum', 'alan'],
          permission: HrPermissions.areasRead,
        },
        {
          title: 'Giriş/Çıkış',
          icon: Fingerprint,
          to: '/hr/attendance',
          keywords: ['giriş', 'çıkış', 'attendance', 'pdks', 'kayıt'],
          permission: HrPermissions.attendanceRead,
        },
        {
          title: 'Kartlı Geçiş',
          icon: CreditCard,
          to: '/hr/card-access',
          keywords: ['kart', 'kartlı geçiş', 'card', 'içe aktar', 'pdks'],
          permission: HrPermissions.cardsRead,
        },
      ],
    },
  ],
}
