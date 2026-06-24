import { ComponentsPermissions } from '@turbohesap/shared'

import type { PermissionDef } from './common/permission.types'
import { IAM_PERMISSION_DEFS } from './modules/iam/iam.permissions'

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
  // components: frontend-only gallery module (no backend resource), gated by a
  // single read permission.
  { key: ComponentsPermissions.read, description: 'Bileşen galerisini görüntüleme', group: 'components' },

  // Smoke-test entry: proves that a newly-declared permission is auto-created on
  // boot. Safe to remove — it is not used to guard any route.
  { key: 'test.test.test', description: 'Test izni (otomatik ekleme örneği)', group: 'test' },
]

// All permission keys — used to grant the admin role everything.
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATALOG.map((p) => p.key)
