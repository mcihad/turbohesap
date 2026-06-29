// Permission keys for the orders module (Teklif/Sipariş/İrsaliye).
export const OrdersPermissions = {
  read: 'orders.read',
  write: 'orders.write',
  /** Assign a number / ship (delivery → posts stock). */
  confirm: 'orders.confirm',
  /** Convert a document to the next step (→ order / delivery / invoice). */
  convert: 'orders.convert',
  cancel: 'orders.cancel',
} as const

export type OrdersPermission = (typeof OrdersPermissions)[keyof typeof OrdersPermissions]
