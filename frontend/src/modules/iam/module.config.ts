import {
  Activity,
  Bug,
  FileClock,
  IdCard,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from 'lucide-react'

import { IamPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

// Yönetim (IAM) — users, roles and permissions, backed by /api/iam/*.
export const iamModule: AppModule = {
  key: 'iam',
  label: 'Yönetim',
  icon: ShieldCheck,
  home: '/iam',
  nav: [
    {
      items: [{ title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/iam', exact: true }],
    },
    {
      label: 'Kimlik ve Yetki',
      icon: IdCard,
      items: [
        {
          title: 'Kullanıcılar',
          icon: Users,
          to: '/iam/users',
          permission: IamPermissions.usersRead,
        },
        {
          title: 'Roller',
          icon: ShieldCheck,
          to: '/iam/roles',
          permission: IamPermissions.rolesRead,
        },
        {
          title: 'İzinler',
          icon: KeyRound,
          to: '/iam/permissions',
          keywords: ['yetki', 'permission'],
          permission: IamPermissions.permissionsRead,
        },
      ],
    },
    {
      label: 'İzleme',
      icon: Activity,
      items: [
        {
          title: 'Denetim Kayıtları',
          icon: FileClock,
          to: '/iam/audit-logs',
          keywords: ['audit', 'denetim', 'log', 'değişiklik'],
          permission: IamPermissions.auditRead,
        },
        {
          title: 'Hata Kayıtları',
          icon: Bug,
          to: '/iam/error-logs',
          keywords: ['error', 'hata', 'log', 'exception'],
          permission: IamPermissions.errorsRead,
        },
      ],
    },
  ],
}
