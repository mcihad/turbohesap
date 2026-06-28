// Permission keys for the POS module — fine-grained so a store can give cashiers
// "sell" but reserve refunds/voids/discount-overrides/reports for managers.
export const PosPermissions = {
  registersRead: 'pos.registers.read',
  registersWrite: 'pos.registers.write',
  sell: 'pos.sell',
  sessionOpen: 'pos.session.open',
  sessionClose: 'pos.session.close',
  discountLine: 'pos.discount.line',
  discountOverride: 'pos.discount.override',
  priceOverride: 'pos.price.override',
  refund: 'pos.refund',
  void: 'pos.void',
  drawerOpen: 'pos.drawer.open',
  reprint: 'pos.reprint',
  reports: 'pos.reports',
  kitchenView: 'pos.kitchen.view',
  kitchenBump: 'pos.kitchen.bump',
  tablesManage: 'pos.tables.manage',
  settings: 'pos.settings',
  usersPin: 'pos.users.pin',
} as const

export type PosPermission = (typeof PosPermissions)[keyof typeof PosPermissions]
