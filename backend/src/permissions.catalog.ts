import type { PermissionDef } from './common/permission.types'
import { IAM_PERMISSION_DEFS } from './modules/iam/iam.permissions'
import { SALES_PERMISSION_DEFS } from './modules/sales/sales.permissions'
import { ORG_PERMISSION_DEFS } from './modules/org/org.permissions'
import { LOOKUPS_PERMISSION_DEFS } from './modules/lookups/lookups.permissions'
import { INVENTORY_PERMISSION_DEFS } from './modules/inventory/inventory.permissions'
import { FILES_PERMISSION_DEFS } from './modules/files/files.permissions'
import { FINANCE_PERMISSION_DEFS } from './modules/finance/finance.permissions'
import { CONTACTS_PERMISSION_DEFS } from './modules/contacts/contacts.permissions'
import { INVOICES_PERMISSION_DEFS } from './modules/invoices/invoices.permissions'
import { ORDERS_PERMISSION_DEFS } from './modules/orders/orders.permissions'
import { POS_PERMISSION_DEFS } from './modules/pos/pos.permissions'
import { FEEDBACK_PERMISSION_DEFS } from './modules/feedback/feedback.permissions'
import { REPORTS_PERMISSION_DEFS } from './modules/reports/reports.permissions'
import { HR_PERMISSION_DEFS } from './modules/hr/hr.permissions'
import { STOCKTAKE_PERMISSION_DEFS } from './modules/stocktake/stocktake.permissions'

// The aggregated permission catalog: the union of every module's declared
// permissions. On startup `SeedService` upserts these into the `permissions`
// table — any key missing from the DB is inserted automatically, so a permission
// becomes available simply by declaring it here (or in a module's *.permissions
// file referenced below) and restarting.
//
// As the app grows, add each module's permission list:
//   ...IAM_PERMISSIONS,
//   ...INVENTORY_PERMISSIONS,
//   ...
export const PERMISSION_CATALOG: PermissionDef[] = [
  ...IAM_PERMISSION_DEFS,
  ...SALES_PERMISSION_DEFS,
  ...ORG_PERMISSION_DEFS,
  ...LOOKUPS_PERMISSION_DEFS,
  ...INVENTORY_PERMISSION_DEFS,
  ...FILES_PERMISSION_DEFS,
  ...FINANCE_PERMISSION_DEFS,
  ...CONTACTS_PERMISSION_DEFS,
  ...INVOICES_PERMISSION_DEFS,
  ...ORDERS_PERMISSION_DEFS,
  ...POS_PERMISSION_DEFS,
  ...FEEDBACK_PERMISSION_DEFS,
  ...REPORTS_PERMISSION_DEFS,
  ...HR_PERMISSION_DEFS,
  ...STOCKTAKE_PERMISSION_DEFS,

  // Smoke-test entry: proves that a newly-declared permission is auto-created on
  // boot. Safe to remove — it is not used to guard any route.
  { key: 'test.test.test', description: 'Test izni (otomatik ekleme örneği)', group: 'test' },
]

// All permission keys — used to grant the admin role everything.
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATALOG.map((p) => p.key)
