import type { AppModule } from './types'
import { genelModule } from './genel/module.config'
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
import { lookupsModule } from './lookups/module.config'
import { feedbackModule } from './feedback/module.config'
import { iamModule } from './iam/module.config'

// The ordered list of modules rendered in the left rail. Add a module's config
// here to make it appear.
export const APP_MODULES: AppModule[] = [
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
  lookupsModule,
  feedbackModule,
  iamModule,
]

export function getModule(key: string): AppModule | undefined {
  return APP_MODULES.find((m) => m.key === key)
}

/** Resolve the active module from a pathname (its first segment). */
export function moduleForPathname(pathname: string): AppModule | undefined {
  const seg = pathname.split('/').filter(Boolean)[0]
  return seg ? getModule(seg) : undefined
}
