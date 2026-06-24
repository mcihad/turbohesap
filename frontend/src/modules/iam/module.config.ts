import { KeyRound, ShieldCheck, Users } from 'lucide-react'

import type { AppModule } from '@/modules/types'

// Yönetim (IAM) — users, roles and permissions, backed by /api/iam/*.
export const iamModule: AppModule = {
  key: 'iam',
  label: 'Yönetim',
  icon: ShieldCheck,
  home: '/iam/users',
  nav: [
    {
      label: 'Kimlik ve Yetki',
      items: [
        {
          title: 'Kullanıcılar',
          icon: Users,
          to: '/iam/users',
          permission: 'iam.users.read',
        },
        {
          title: 'Roller',
          icon: ShieldCheck,
          to: '/iam/roles',
          permission: 'iam.roles.read',
        },
        {
          title: 'İzinler',
          icon: KeyRound,
          to: '/iam/permissions',
          keywords: ['yetki', 'permission'],
          permission: 'iam.permissions.read',
        },
      ],
    },
  ],
}
