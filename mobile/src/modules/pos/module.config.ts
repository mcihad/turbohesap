import { InventoryPermissions, PosPermissions } from '@turbohesap/shared'

import type { MobileModule } from '../types'

export const posModule: MobileModule = {
  key: 'pos',
  label: 'POS',
  icon: 'shopping-cart',
  home: 'pos.home',
  // Panel tab renders the rich POS dashboard (quick actions + counts).
  dashboardScreen: 'pos.home',
  permission: PosPermissions.sell,
  // These become the module's bottom tabs (besides the Panel/dashboard). Each
  // key must resolve to a registered screen and be unique. The dashboard also
  // surfaces the "Kasalar" (registersRead) destination.
  items: [
    {
      key: 'pos.registers',
      title: 'Satış',
      icon: 'shopping-cart',
      description: 'Kasa seç ve satış yap',
      permission: PosPermissions.sell,
    },
    {
      key: 'pos.floors',
      title: 'Masalar',
      icon: 'grid',
      description: 'Kat ve masa düzeni',
      permission: PosPermissions.tablesManage,
    },
    {
      key: 'pos.modifiers',
      title: 'Seçenekler',
      icon: 'sliders',
      description: 'Ürün seçenek grupları',
      permission: InventoryPermissions.modifiersRead,
    },
  ],
}
