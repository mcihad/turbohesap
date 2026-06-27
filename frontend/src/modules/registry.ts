import type { AppModule } from './types'
import { genelModule } from './genel/module.config'
import { salesModule } from './sales/module.config'
import { orgModule } from './org/module.config'
import { inventoryModule } from './inventory/module.config'
import { financeModule } from './finance/module.config'
import { lookupsModule } from './lookups/module.config'
import { iamModule } from './iam/module.config'
import { componentsModule } from './components/module.config'

// The ordered list of modules rendered in the left rail. Add a module's config
// here to make it appear.
export const APP_MODULES: AppModule[] = [
  genelModule,
  salesModule,
  orgModule,
  inventoryModule,
  financeModule,
  lookupsModule,
  iamModule,
  componentsModule,
]

export function getModule(key: string): AppModule | undefined {
  return APP_MODULES.find((m) => m.key === key)
}

/** Resolve the active module from a pathname (its first segment). */
export function moduleForPathname(pathname: string): AppModule | undefined {
  const seg = pathname.split('/').filter(Boolean)[0]
  return seg ? getModule(seg) : undefined
}
