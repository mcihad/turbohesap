// Üretim (manufacturing/MRP) modülü izin anahtarları — SSOT.
export const ProductionPermissions = {
  /** View BOMs, work centers, manufacturing orders. */
  read: 'production.read',
  /** Create/edit master data: BOMs (reçete) + work centers (iş merkezi). */
  write: 'production.write',
  /** Create/edit manufacturing orders (üretim emri). */
  ordersWrite: 'production.orders.write',
  /** Confirm a manufacturing order (explode + reserve). */
  ordersConfirm: 'production.orders.confirm',
  /** Complete an order (consume + produce stock, post cost). */
  ordersComplete: 'production.orders.complete',
  /** Cancel a manufacturing order (reverse stock). */
  ordersCancel: 'production.orders.cancel',
  /** Shop-floor: start/pause/finish work orders, report qty/scrap. */
  workordersExecute: 'production.workorders.execute',
  /** Subcontracting (fason) dispatch/return management. */
  subcontractManage: 'production.subcontract.manage',
  /** Run the MRP/replenishment planning. */
  planningRun: 'production.planning.run',
  /** Quality checks + lot/serial management. */
  qualityManage: 'production.quality.manage',
} as const

export type ProductionPermission =
  (typeof ProductionPermissions)[keyof typeof ProductionPermissions]
