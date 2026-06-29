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
import { ProductModifiersApiClient } from '../modules/inventory/product-modifiers.client'
import type { IProductModifiersService } from '../modules/inventory/product-modifiers.service'
import { ProductBundlesApiClient } from '../modules/inventory/product-bundles.client'
import type { IProductBundlesService } from '../modules/inventory/product-bundles.service'
import { StockMovementTypesApiClient } from '../modules/inventory/stock-movement-types.client'
import type { IStockMovementTypesService } from '../modules/inventory/stock-movement-types.service'
import { StockMovementsApiClient } from '../modules/inventory/stock-movements.client'
import type { IStockMovementsService } from '../modules/inventory/stock-movements.service'
import { HealthApiClient } from '../modules/health/health.client'
import type { IHealthService } from '../modules/health/health.service'
import { CashAccountsApiClient } from '../modules/finance/cash-accounts.client'
import type { ICashAccountsService } from '../modules/finance/cash-accounts.service'
import { BankAccountsApiClient } from '../modules/finance/bank-accounts.client'
import type { IBankAccountsService } from '../modules/finance/bank-accounts.service'
import { FinanceTransactionsApiClient } from '../modules/finance/finance-transactions.client'
import type { IFinanceTransactionsService } from '../modules/finance/finance-transactions.service'
import { ContactsApiClient } from '../modules/contacts/contacts.client'
import type { IContactsService } from '../modules/contacts/contacts.service'
import { ContactGroupsApiClient } from '../modules/contacts/contact-groups.client'
import type { IContactGroupsService } from '../modules/contacts/contact-groups.service'
import { ContactPersonsApiClient } from '../modules/contacts/contact-persons.client'
import type { IContactPersonsService } from '../modules/contacts/contact-persons.service'
import { ContactAddressesApiClient } from '../modules/contacts/contact-addresses.client'
import type { IContactAddressesService } from '../modules/contacts/contact-addresses.service'
import { ContactTransactionsApiClient } from '../modules/contacts/contact-transactions.client'
import type { IContactTransactionsService } from '../modules/contacts/contact-transactions.service'
import { ActivitiesApiClient } from '../modules/contacts/activities.client'
import type { IActivitiesService } from '../modules/contacts/activities.service'
import { OpportunitiesApiClient } from '../modules/contacts/opportunities.client'
import type { IOpportunitiesService } from '../modules/contacts/opportunities.service'
import { PipelinesApiClient } from '../modules/contacts/pipelines.client'
import type { IPipelinesService } from '../modules/contacts/pipelines.service'
import { CrmAnalyticsApiClient } from '../modules/contacts/crm-analytics.client'
import type { ICrmAnalyticsService } from '../modules/contacts/crm-analytics.service'
import { NotificationsApiClient } from '../modules/contacts/notifications.client'
import type { INotificationsService } from '../modules/contacts/notifications.service'
import { CrmFieldsApiClient } from '../modules/contacts/crm-fields.client'
import type { ICrmFieldsService } from '../modules/contacts/crm-fields.service'
import { IntegrationsApiClient } from '../modules/contacts/integrations.client'
import type { IIntegrationsService } from '../modules/contacts/integrations.service'
import { PosRegistersApiClient } from '../modules/pos/registers.client'
import type { IPosRegistersService } from '../modules/pos/registers.service'
import { PosSessionsApiClient } from '../modules/pos/sessions.client'
import type { IPosSessionsService } from '../modules/pos/sessions.service'
import { PosOrdersApiClient } from '../modules/pos/orders.client'
import type { IPosOrdersService } from '../modules/pos/orders.service'
import { PosTablesApiClient } from '../modules/pos/tables.client'
import type { IPosTablesService } from '../modules/pos/tables.service'
import { InvoicesApiClient } from '../modules/invoices/invoices.client'
import type { IInvoicesService } from '../modules/invoices/invoices.service'
import { FeedbackApiClient } from '../modules/feedback/feedback.client'
import type { IFeedbackService } from '../modules/feedback/feedback.service'
import { ReportsApiClient } from '../modules/reports/reports.client'
import type { IReportsService } from '../modules/reports/reports.service'
import { OrdersApiClient } from '../modules/orders/orders.client'
import type { IOrdersService } from '../modules/orders/orders.service'
import {
  EmployeesApiClient,
  LeaveTypesApiClient,
  LeaveRequestsApiClient,
  TimesheetsApiClient,
  PayrollApiClient,
  PayrollParamsApiClient,
} from '../modules/hr/hr.client'
import type {
  IEmployeesService,
  ILeaveTypesService,
  ILeaveRequestsService,
  ITimesheetsService,
  IPayrollService,
  IPayrollParamsService,
} from '../modules/hr/hr.service'
import { StocktakeApiClient } from '../modules/stocktake/stocktake.client'
import type { IStocktakeService } from '../modules/stocktake/stocktake.service'
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
  modifiers: IProductModifiersService
  bundles: IProductBundlesService
  movementTypes: IStockMovementTypesService
  stockMovements: IStockMovementsService
}

export interface PosApi {
  registers: IPosRegistersService
  sessions: IPosSessionsService
  orders: IPosOrdersService
  tables: IPosTablesService
}

export interface FinanceApi {
  cashAccounts: ICashAccountsService
  bankAccounts: IBankAccountsService
  transactions: IFinanceTransactionsService
}

export interface ContactsApi {
  contacts: IContactsService
  groups: IContactGroupsService
  persons: IContactPersonsService
  addresses: IContactAddressesService
  transactions: IContactTransactionsService
  activities: IActivitiesService
  opportunities: IOpportunitiesService
  pipelines: IPipelinesService
  crm: ICrmAnalyticsService
  notifications: INotificationsService
  fields: ICrmFieldsService
  integrations: IIntegrationsService
}

export interface HrApi {
  employees: IEmployeesService
  leaveTypes: ILeaveTypesService
  leaveRequests: ILeaveRequestsService
  timesheets: ITimesheetsService
  payroll: IPayrollService
  params: IPayrollParamsService
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
  /** Cari (contacts/CRM): contacts, groups, persons, addresses, ledger, activities, opportunities. */
  contacts: ContactsApi
  /** POS (point of sale): registers, sessions, orders/payments. */
  pos: PosApi
  /** Fatura (invoices): sales/purchase invoices with KDV + tevkifat. */
  invoices: IInvoicesService
  /** In-app feedback (istek/talep/öneri/hata) with annotated screenshots. */
  feedback: IFeedbackService
  /** Per-module analytics/statistics (cached server-side). */
  reports: IReportsService
  /** Sipariş yönetimi: Teklif → Sipariş → İrsaliye → Fatura (sales & purchase). */
  orders: IOrdersService
  /** İK & Bordro: personel, izin, puantaj, bordro (Türkiye payroll). */
  hr: HrApi
  /** Stok/Envanter Sayımı (stocktake): count sessions → posted stock adjustments. */
  stocktake: IStocktakeService
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
      modifiers: new ProductModifiersApiClient(http),
      bundles: new ProductBundlesApiClient(http),
      movementTypes: new StockMovementTypesApiClient(http),
      stockMovements: new StockMovementsApiClient(http),
    },
    finance: {
      cashAccounts: new CashAccountsApiClient(http),
      bankAccounts: new BankAccountsApiClient(http),
      transactions: new FinanceTransactionsApiClient(http),
    },
    contacts: {
      contacts: new ContactsApiClient(http),
      groups: new ContactGroupsApiClient(http),
      persons: new ContactPersonsApiClient(http),
      addresses: new ContactAddressesApiClient(http),
      transactions: new ContactTransactionsApiClient(http),
      activities: new ActivitiesApiClient(http),
      opportunities: new OpportunitiesApiClient(http),
      pipelines: new PipelinesApiClient(http),
      crm: new CrmAnalyticsApiClient(http),
      notifications: new NotificationsApiClient(http),
      fields: new CrmFieldsApiClient(http),
      integrations: new IntegrationsApiClient(http),
    },
    pos: {
      registers: new PosRegistersApiClient(http),
      sessions: new PosSessionsApiClient(http),
      orders: new PosOrdersApiClient(http),
      tables: new PosTablesApiClient(http),
    },
    invoices: new InvoicesApiClient(http),
    feedback: new FeedbackApiClient(http),
    reports: new ReportsApiClient(http),
    orders: new OrdersApiClient(http),
    hr: {
      employees: new EmployeesApiClient(http),
      leaveTypes: new LeaveTypesApiClient(http),
      leaveRequests: new LeaveRequestsApiClient(http),
      timesheets: new TimesheetsApiClient(http),
      payroll: new PayrollApiClient(http),
      params: new PayrollParamsApiClient(http),
    },
    stocktake: new StocktakeApiClient(http),
    lookups: new LookupsApiClient(http),
    files: new FilesApiClient(http),
    settings: new SettingsApiClient(http),
    health: new HealthApiClient(http),
  }
}
