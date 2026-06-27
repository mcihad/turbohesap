import type { AxiosInstance } from 'axios'

import { AuthApiClient } from '../modules/auth/auth.client'
import type { IAuthService } from '../modules/auth/auth.service'
import { UsersApiClient } from '../modules/iam/users.client'
import type { IUsersService } from '../modules/iam/users.service'
import { RolesApiClient } from '../modules/iam/roles.client'
import type { IRolesService } from '../modules/iam/roles.service'
import { PermissionsApiClient } from '../modules/iam/permissions.client'
import type { IPermissionsService } from '../modules/iam/permissions.service'
import { AuditLogsApiClient } from '../modules/iam/audit-logs.client'
import type { IAuditLogsService } from '../modules/iam/audit-logs.service'
import { ErrorLogsApiClient } from '../modules/iam/error-logs.client'
import type { IErrorLogsService } from '../modules/iam/error-logs.service'
import { SalesChannelsApiClient } from '../modules/sales/sales-channels.client'
import type { ISalesChannelsService } from '../modules/sales/sales-channels.service'
import { BranchesApiClient } from '../modules/org/branches.client'
import type { IBranchesService } from '../modules/org/branches.service'
import { LookupsApiClient } from '../modules/lookups/lookups.client'
import type { ILookupsService } from '../modules/lookups/lookups.service'
import { FilesApiClient } from '../modules/files/files.client'
import type { IFilesService } from '../modules/files/files.service'
import { SettingsApiClient } from '../modules/settings/settings.client'
import type { ISettingsService } from '../modules/settings/settings.service'
import { CategoriesApiClient } from '../modules/inventory/categories.client'
import type { ICategoriesService } from '../modules/inventory/categories.service'
import { ProductsApiClient } from '../modules/inventory/products.client'
import type { IProductsService } from '../modules/inventory/products.service'
import { HealthApiClient } from '../modules/health/health.client'
import type { IHealthService } from '../modules/health/health.service'
import { CashAccountsApiClient } from '../modules/finance/cash-accounts.client'
import type { ICashAccountsService } from '../modules/finance/cash-accounts.service'
import { BankAccountsApiClient } from '../modules/finance/bank-accounts.client'
import type { IBankAccountsService } from '../modules/finance/bank-accounts.service'
import { createHttpClient, type HttpClientConfig } from './http'

// Resources are grouped by module — `api.<module>.<resource>` — mirroring the
// `/api/<module>/<resource>` routes. A module with a single service (auth,
// health) is exposed directly; a module with multiple resources (iam) groups
// them. This keeps resource names from colliding as modules grow.
export interface IamApi {
  users: IUsersService
  roles: IRolesService
  permissions: IPermissionsService
  auditLogs: IAuditLogsService
  errorLogs: IErrorLogsService
}

export interface SalesApi {
  channels: ISalesChannelsService
}

export interface OrgApi {
  branches: IBranchesService
}

export interface InventoryApi {
  categories: ICategoriesService
  products: IProductsService
}

export interface FinanceApi {
  cashAccounts: ICashAccountsService
  bankAccounts: IBankAccountsService
}

// TurbohesapApi bundles every module's service client behind its interface.
// Consumers depend on these interfaces, not the concrete axios classes. Add new
// modules here (a new top-level key, or grouped like `iam`).
export interface TurbohesapApi {
  auth: IAuthService
  iam: IamApi
  sales: SalesApi
  org: OrgApi
  inventory: InventoryApi
  finance: FinanceApi
  /** Generic key/value reference-data lists. */
  lookups: ILookupsService
  /** Generic file uploads/attachments (images + files for any entity). */
  files: IFilesService
  /** Per-user settings store (UI prefs, data-grid state, …). */
  settings: ISettingsService
  health: IHealthService
  /** The underlying axios instance, for app-specific calls. */
  http: AxiosInstance
}

export type TurbohesapApiConfig = HttpClientConfig

// createTurbohesapApi wires the axios http client and every module's service
// client into a single, typed API object. This is the one entry point apps call
// — the web frontend and the mobile app each pass their own platform config.
export function createTurbohesapApi(
  config: TurbohesapApiConfig = {},
): TurbohesapApi {
  const http = createHttpClient(config)
  return {
    http,
    auth: new AuthApiClient(http),
    iam: {
      users: new UsersApiClient(http),
      roles: new RolesApiClient(http),
      permissions: new PermissionsApiClient(http),
      auditLogs: new AuditLogsApiClient(http),
      errorLogs: new ErrorLogsApiClient(http),
    },
    sales: {
      channels: new SalesChannelsApiClient(http),
    },
    org: {
      branches: new BranchesApiClient(http),
    },
    inventory: {
      categories: new CategoriesApiClient(http),
      products: new ProductsApiClient(http),
    },
    finance: {
      cashAccounts: new CashAccountsApiClient(http),
      bankAccounts: new BankAccountsApiClient(http),
    },
    lookups: new LookupsApiClient(http),
    files: new FilesApiClient(http),
    settings: new SettingsApiClient(http),
    health: new HealthApiClient(http),
  }
}
