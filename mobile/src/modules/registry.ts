// Module registry — the ordered list of modules surfaced as bottom tabs. Mirrors
// the web's `frontend/src/modules/registry.ts`, using the same permission keys
// from @turbohesap/shared. (The web-only `components` gallery is intentionally
// omitted on mobile.)

import { IamPermissions, ReportsPermissions } from '@turbohesap/shared'

import { type Can, accessibleModules } from '../lib/auth/access'
import { salesModule } from './sales/module.config'
import { orgModule } from './org/module.config'
import { inventoryModule } from './inventory/module.config'
import { posModule } from './pos/module.config'
import { financeModule } from './finance/module.config'
import { contactsModule } from './contacts/module.config'
import { invoicesModule } from './invoices/module.config'
import { ordersModule } from './orders/module.config'
import { stocktakeModule } from './stocktake/module.config'
import { productionModule } from './production/module.config'
import { hrModule } from './hr/module.config'
import { feedbackModule } from './feedback/module.config'
import { lookupsModule } from './lookups/module.config'
import { documentsModule } from './documents/module.config'
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
    {
      key: 'genel.analytics',
      title: 'Genel Analiz',
      icon: 'bar-chart-2',
      description: 'Tüm modüllerin özeti',
      permission: ReportsPermissions.overview,
    },
    {
      key: 'genel.analytics.pos',
      title: 'POS Analizi',
      icon: 'shopping-cart',
      description: 'Satış noktası metrikleri',
      permission: ReportsPermissions.pos,
    },
    {
      key: 'genel.analytics.inventory',
      title: 'Envanter Analizi',
      icon: 'package',
      description: 'Stok ve ürün metrikleri',
      permission: ReportsPermissions.inventory,
    },
    {
      key: 'genel.analytics.finance',
      title: 'Finans Analizi',
      icon: 'dollar-sign',
      description: 'Kasa ve banka metrikleri',
      permission: ReportsPermissions.finance,
    },
    {
      key: 'genel.analytics.invoices',
      title: 'Fatura Analizi',
      icon: 'file-text',
      description: 'Fatura ve KDV metrikleri',
      permission: ReportsPermissions.invoices,
    },
    {
      key: 'genel.analytics.contacts',
      title: 'Cari Analizi',
      icon: 'users',
      description: 'Cari hesap metrikleri',
      permission: ReportsPermissions.contacts,
    },
    {
      key: 'genel.analytics.sales',
      title: 'Satış Analizi',
      icon: 'trending-up',
      description: 'Satış kanalı metrikleri',
      permission: ReportsPermissions.sales,
    },
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
  posModule,
  financeModule,
  contactsModule,
  invoicesModule,
  ordersModule,
  stocktakeModule,
  productionModule,
  hrModule,
  feedbackModule,
  lookupsModule,
  documentsModule,
  iamModule,
]

export function getModule(key: string): MobileModule | undefined {
  return APP_MODULES.find((m) => m.key === key)
}

/** Modules the signed-in user can see (≥1 visible item, or no gating). */
export function visibleModules(can: Can): MobileModule[] {
  return accessibleModules(APP_MODULES, can)
}
