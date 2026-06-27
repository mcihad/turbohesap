// Module registry — the ordered list of modules surfaced as bottom tabs. Mirrors
// the web's `frontend/src/modules/registry.ts`, using the same permission keys
// from @turbohesap/shared. (The web-only `components` gallery is intentionally
// omitted on mobile.)

import { IamPermissions } from '@turbohesap/shared'

import { type Can, accessibleModules } from '../lib/auth/access'
import { salesModule } from './sales/module.config'
import { orgModule } from './org/module.config'
import { inventoryModule } from './inventory/module.config'
import { lookupsModule } from './lookups/module.config'
import type { MobileModule } from './types'

// Genel — overview / dashboards. No permission gating: always visible. Uses its
// own rich dashboard as the Panel tab.
const genelModule: MobileModule = {
  key: 'genel',
  label: 'Genel',
  icon: 'grid',
  home: 'genel.dashboard',
  dashboardScreen: 'genel.dashboard',
  items: [
    { key: 'genel.analytics', title: 'Analiz', icon: 'bar-chart-2', description: 'Raporlar ve metrikler' },
  ],
}

// Yönetim (IAM) — users, roles, permissions + observability. Each item gates on
// its read permission, exactly like the web sidebar.
const iamModule: MobileModule = {
  key: 'iam',
  label: 'Yönetim',
  icon: 'shield',
  home: 'iam.home',
  items: [
    {
      key: 'iam.users',
      title: 'Kullanıcılar',
      icon: 'users',
      description: 'Kullanıcı hesapları',
      permission: IamPermissions.usersRead,
    },
    {
      key: 'iam.roles',
      title: 'Roller',
      icon: 'shield',
      description: 'Rol ve yetki grupları',
      permission: IamPermissions.rolesRead,
    },
    {
      key: 'iam.permissions',
      title: 'İzinler',
      icon: 'key',
      description: 'İzin kataloğu',
      permission: IamPermissions.permissionsRead,
    },
    {
      key: 'iam.audit',
      title: 'Denetim Kayıtları',
      icon: 'file-text',
      description: 'Değişiklik geçmişi',
      permission: IamPermissions.auditRead,
    },
    {
      key: 'iam.errors',
      title: 'Hata Kayıtları',
      icon: 'alert-octagon',
      description: 'Sunucu ve istemci hataları',
      permission: IamPermissions.errorsRead,
    },
  ],
}

export const APP_MODULES: MobileModule[] = [
  genelModule,
  salesModule,
  orgModule,
  inventoryModule,
  lookupsModule,
  iamModule,
]

export function getModule(key: string): MobileModule | undefined {
  return APP_MODULES.find((m) => m.key === key)
}

/** Modules the signed-in user can see (≥1 visible item, or no gating). */
export function visibleModules(can: Can): MobileModule[] {
  return accessibleModules(APP_MODULES, can)
}
