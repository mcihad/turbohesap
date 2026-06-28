// Per-module dashboard bodies for the generic ModuleDashboardScreen. Maps a
// module key to its full dashboard (stats + charts + recent) — the mobile twin of
// the web module dashboards. genel renders its own rich DashboardScreen instead.

import * as React from 'react'

import { IamDashboard } from '../modules/iam/IamDashboard'
import { InventoryDashboard } from '../modules/inventory/InventoryDashboard'
import { LookupsDashboard } from '../modules/lookups/LookupsDashboard'
import { OrgDashboard } from '../modules/org/OrgDashboard'
import { SalesDashboard } from '../modules/sales/SalesDashboard'
import { FinanceDashboard } from '../modules/finance/FinanceDashboard'
import { ContactsDashboard } from '../modules/contacts/ContactsDashboard'
import { InvoicesDashboard } from '../modules/invoices/InvoicesDashboard'

export const MODULE_DASHBOARDS: Record<string, () => React.ReactElement> = {
  sales: () => <SalesDashboard />,
  org: () => <OrgDashboard />,
  inventory: () => <InventoryDashboard />,
  finance: () => <FinanceDashboard />,
  contacts: () => <ContactsDashboard />,
  invoices: () => <InvoicesDashboard />,
  lookups: () => <LookupsDashboard />,
  iam: () => <IamDashboard />,
}
