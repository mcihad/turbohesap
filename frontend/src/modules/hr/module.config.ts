import {
  BadgeDollarSign,
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
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
  ],
}
