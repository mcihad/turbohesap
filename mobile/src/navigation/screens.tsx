// Screen registry — maps screen keys (used by module nav items + navigate())
// to their components. Components read any params from useNav().current.params,
// so every entry is a zero-prop element. Add a screen here when you add a key.

import * as React from 'react'

import {
  AnalyticsScreen,
  ContactsAnalyticsScreen,
  FinanceAnalyticsScreen,
  InventoryAnalyticsScreen,
  InvoicesAnalyticsScreen,
  PosAnalyticsScreen,
  SalesAnalyticsScreen,
} from '../modules/genel/AnalyticsScreen'
import { DashboardScreen } from '../modules/genel/DashboardScreen'
import { AuditDetailScreen } from '../modules/iam/AuditDetailScreen'
import { AuditLogsScreen } from '../modules/iam/AuditLogsScreen'
import { EntityAuditScreen } from '../modules/iam/EntityAuditScreen'
import { ErrorDetailScreen } from '../modules/iam/ErrorDetailScreen'
import { ErrorLogsScreen } from '../modules/iam/ErrorLogsScreen'
import { PermissionDetailScreen } from '../modules/iam/PermissionDetailScreen'
import { PermissionsScreen } from '../modules/iam/PermissionsScreen'
import { RoleDetailScreen } from '../modules/iam/RoleDetailScreen'
import { RoleFormScreen } from '../modules/iam/RoleFormScreen'
import { RolesScreen } from '../modules/iam/RolesScreen'
import { UserDetailScreen } from '../modules/iam/UserDetailScreen'
import { UserFormScreen } from '../modules/iam/UserFormScreen'
import { UsersScreen } from '../modules/iam/UsersScreen'
import { ChannelDetailScreen } from '../modules/sales/ChannelDetailScreen'
import { ChannelFormScreen } from '../modules/sales/ChannelFormScreen'
import { ChannelsScreen } from '../modules/sales/ChannelsScreen'
import { BranchDetailScreen } from '../modules/org/BranchDetailScreen'
import { BranchFormScreen } from '../modules/org/BranchFormScreen'
import { BranchesScreen } from '../modules/org/BranchesScreen'
import { LookupItemFormScreen } from '../modules/lookups/LookupItemFormScreen'
import { LookupListScreen } from '../modules/lookups/LookupListScreen'
import { LookupsScreen } from '../modules/lookups/LookupsScreen'
import { CategoriesScreen } from '../modules/inventory/CategoriesScreen'
import { CategoryDetailScreen } from '../modules/inventory/CategoryDetailScreen'
import { CategoryFieldFormScreen } from '../modules/inventory/CategoryFieldFormScreen'
import { CategoryFormScreen } from '../modules/inventory/CategoryFormScreen'
import { ProductDetailScreen } from '../modules/inventory/ProductDetailScreen'
import { ProductFormScreen } from '../modules/inventory/ProductFormScreen'
import { ProductsScreen } from '../modules/inventory/ProductsScreen'
import { AssetsScreen } from '../modules/inventory/AssetsScreen'
import { AssetDetailScreen } from '../modules/inventory/AssetDetailScreen'
import { MyAssignmentsScreen } from '../modules/inventory/MyAssignmentsScreen'
import { TransferInitiateScreen } from '../modules/inventory/TransferInitiateScreen'
import { TransferReceiveScreen } from '../modules/inventory/TransferReceiveScreen'
import { PosDashboardScreen } from '../modules/pos/PosDashboardScreen'
import { PosRegistersScreen } from '../modules/pos/PosRegistersScreen'
import { PosSellScreen } from '../modules/pos/PosSellScreen'
import { PosTenderScreen } from '../modules/pos/PosTenderScreen'
import { PosFloorsScreen } from '../modules/pos/PosFloorsScreen'
import { PosModifierGroupsScreen } from '../modules/pos/PosModifierGroupsScreen'
import { CashAccountsScreen } from '../modules/finance/CashAccountsScreen'
import { CashAccountDetailScreen } from '../modules/finance/CashAccountDetailScreen'
import { CashAccountFormScreen } from '../modules/finance/CashAccountFormScreen'
import { BankAccountsScreen } from '../modules/finance/BankAccountsScreen'
import { BankAccountDetailScreen } from '../modules/finance/BankAccountDetailScreen'
import { BankAccountFormScreen } from '../modules/finance/BankAccountFormScreen'
import { FinanceTransactionFormScreen } from '../modules/finance/FinanceTransactionFormScreen'
import { ContactsScreen } from '../modules/contacts/ContactsScreen'
import { ContactDetailScreen } from '../modules/contacts/ContactDetailScreen'
import { ContactFormScreen } from '../modules/contacts/ContactFormScreen'
import { ContactTransactionFormScreen } from '../modules/contacts/ContactTransactionFormScreen'
import { ContactPersonFormScreen } from '../modules/contacts/ContactPersonFormScreen'
import { ContactAddressFormScreen } from '../modules/contacts/ContactAddressFormScreen'
import { ContactActivityFormScreen } from '../modules/contacts/ContactActivityFormScreen'
import { OpportunitiesScreen } from '../modules/contacts/OpportunitiesScreen'
import { OpportunityFormScreen } from '../modules/contacts/OpportunityFormScreen'
import { OpportunityDetailScreen } from '../modules/contacts/OpportunityDetailScreen'
import { ContactGroupsScreen } from '../modules/contacts/ContactGroupsScreen'
import { ContactGroupDetailScreen } from '../modules/contacts/ContactGroupDetailScreen'
import { PipelineBoardScreen } from '../modules/contacts/PipelineBoardScreen'
import { CrmDashboardScreen } from '../modules/contacts/CrmDashboardScreen'
import { MyWorkScreen } from '../modules/contacts/MyWorkScreen'
import { NotificationsScreen } from '../modules/contacts/NotificationsScreen'
import { LeadsScreen } from '../modules/contacts/LeadsScreen'
import { IntegrationsSettingsScreen } from '../modules/contacts/IntegrationsSettingsScreen'
import { PipelineSettingsScreen } from '../modules/contacts/PipelineSettingsScreen'
import { PipelineStageFormScreen } from '../modules/contacts/PipelineStageFormScreen'
import { CrmFieldsSettingsScreen } from '../modules/contacts/CrmFieldsSettingsScreen'
import { CrmFieldFormScreen } from '../modules/contacts/CrmFieldFormScreen'
import { InvoicesScreen } from '../modules/invoices/InvoicesScreen'
import { InvoiceDetailScreen } from '../modules/invoices/InvoiceDetailScreen'
import { InvoiceEntryScreen } from '../modules/invoices/InvoiceEntryScreen'
import { OrdersListScreen } from '../modules/orders/OrdersListScreen'
import { OrderDetailScreen } from '../modules/orders/OrderDetailScreen'
import { OrderEntryScreen } from '../modules/orders/OrderEntryScreen'
import { StockCountListScreen } from '../modules/stocktake/StockCountListScreen'
import { StockCountDetailScreen } from '../modules/stocktake/StockCountDetailScreen'
import { CountScanScreen } from '../modules/stocktake/CountScanScreen'
import { EmployeesListScreen } from '../modules/hr/EmployeesListScreen'
import { EmployeeDetailScreen } from '../modules/hr/EmployeeDetailScreen'
import { EmployeeEntryScreen } from '../modules/hr/EmployeeEntryScreen'
import { LeavesScreen } from '../modules/hr/LeavesScreen'
import { TimesheetScreen } from '../modules/hr/TimesheetScreen'
import { PayrollScreen } from '../modules/hr/PayrollScreen'
import { PayrollRunDetailScreen } from '../modules/hr/PayrollRunDetailScreen'
import { PayslipDetailScreen } from '../modules/hr/PayslipDetailScreen'
import { CheckinScreen } from '../modules/hr/CheckinScreen'
import { MyScheduleScreen } from '../modules/hr/MyScheduleScreen'
import { ShiftsScreen } from '../modules/hr/ShiftsScreen'
import { ShiftEntryScreen } from '../modules/hr/ShiftEntryScreen'
import { RotationsScreen } from '../modules/hr/RotationsScreen'
import { RotationEntryScreen } from '../modules/hr/RotationEntryScreen'
import { ShiftScheduleScreen } from '../modules/hr/ShiftScheduleScreen'
import { CheckinAreasScreen } from '../modules/hr/CheckinAreasScreen'
import { CheckinAreaEntryScreen } from '../modules/hr/CheckinAreaEntryScreen'
import { AttendanceScreen } from '../modules/hr/AttendanceScreen'
import { AttendanceEntryScreen } from '../modules/hr/AttendanceEntryScreen'
import { CardAccessScreen } from '../modules/hr/CardAccessScreen'
import { CardSourceEntryScreen } from '../modules/hr/CardSourceEntryScreen'
import { EmployeeCardEntryScreen } from '../modules/hr/EmployeeCardEntryScreen'
import { FeedbackListScreen } from '../modules/feedback/FeedbackListScreen'
import { FeedbackDetailScreen } from '../modules/feedback/FeedbackDetailScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { ModuleDashboardScreen } from './ModuleDashboardScreen'
import { ModuleHome } from './ModuleHome'

export const SCREENS: Record<string, () => React.ReactElement> = {
  // Generic module dashboard (Panel tab) for modules without a custom one.
  'module.dashboard': () => <ModuleDashboardScreen />,
  // Genel
  'genel.dashboard': () => <DashboardScreen />,
  'genel.analytics': () => <AnalyticsScreen />,
  'genel.analytics.pos': () => <PosAnalyticsScreen />,
  'genel.analytics.inventory': () => <InventoryAnalyticsScreen />,
  'genel.analytics.finance': () => <FinanceAnalyticsScreen />,
  'genel.analytics.invoices': () => <InvoicesAnalyticsScreen />,
  'genel.analytics.contacts': () => <ContactsAnalyticsScreen />,
  'genel.analytics.sales': () => <SalesAnalyticsScreen />,
  // Satış
  'sales.home': () => <ModuleHome moduleKey="sales" />,
  'sales.channels': () => <ChannelsScreen />,
  'sales.channels.detail': () => <ChannelDetailScreen />,
  'sales.channels.form': () => <ChannelFormScreen />,
  // Organizasyon
  'org.home': () => <ModuleHome moduleKey="org" />,
  'org.branches': () => <BranchesScreen />,
  'org.branches.detail': () => <BranchDetailScreen />,
  'org.branches.form': () => <BranchFormScreen />,
  // Tanım Listeleri (lookups)
  'lookups.lists': () => <LookupsScreen />,
  'lookups.list': () => <LookupListScreen />,
  'lookups.item.form': () => <LookupItemFormScreen />,
  // Envanter (inventory)
  'inventory.home': () => <ModuleHome moduleKey="inventory" />,
  'inventory.products': () => <ProductsScreen />,
  'inventory.products.detail': () => <ProductDetailScreen />,
  'inventory.products.form': () => <ProductFormScreen />,
  'inventory.categories': () => <CategoriesScreen />,
  'inventory.category.detail': () => <CategoryDetailScreen />,
  'inventory.category.form': () => <CategoryFormScreen />,
  'inventory.category.field': () => <CategoryFieldFormScreen />,
  // Demirbaş & Zimmet (fixed assets + custody)
  'inventory.assets': () => <AssetsScreen />,
  'inventory.assetDetail': () => <AssetDetailScreen />,
  'inventory.myAssignments': () => <MyAssignmentsScreen />,
  'inventory.transferInitiate': () => <TransferInitiateScreen />,
  'inventory.transferReceive': () => <TransferReceiveScreen />,
  // Yönetim (IAM)
  'iam.home': () => <ModuleHome moduleKey="iam" />,
  'iam.users': () => <UsersScreen />,
  'iam.users.detail': () => <UserDetailScreen />,
  'iam.users.form': () => <UserFormScreen />,
  'iam.roles': () => <RolesScreen />,
  'iam.roles.detail': () => <RoleDetailScreen />,
  'iam.roles.form': () => <RoleFormScreen />,
  'iam.permissions': () => <PermissionsScreen />,
  'iam.permissions.detail': () => <PermissionDetailScreen />,
  'iam.audit': () => <AuditLogsScreen />,
  'iam.audit.detail': () => <AuditDetailScreen />,
  // Per-entity audit history (reached from any detail screen's header).
  'iam.audit.entity': () => <EntityAuditScreen />,
  'iam.errors': () => <ErrorLogsScreen />,
  'iam.errors.detail': () => <ErrorDetailScreen />,
  // POS (point of sale)
  'pos.home': () => <PosDashboardScreen />,
  'pos.registers': () => <PosRegistersScreen />,
  'pos.sell': () => <PosSellScreen />,
  'pos.tender': () => <PosTenderScreen />,
  'pos.floors': () => <PosFloorsScreen />,
  'pos.modifiers': () => <PosModifierGroupsScreen />,
  // Finans (finance)
  'finance.home': () => <ModuleHome moduleKey="finance" />,
  'finance.cash-accounts': () => <CashAccountsScreen />,
  'finance.cash-accounts.detail': () => <CashAccountDetailScreen />,
  'finance.cash-accounts.form': () => <CashAccountFormScreen />,
  'finance.bank-accounts': () => <BankAccountsScreen />,
  'finance.bank-accounts.detail': () => <BankAccountDetailScreen />,
  'finance.bank-accounts.form': () => <BankAccountFormScreen />,
  'finance.transactions.form': () => <FinanceTransactionFormScreen />,
  // Cari (contacts)
  'contacts.home': () => <ModuleHome moduleKey="contacts" />,
  'contacts.contacts': () => <ContactsScreen />,
  'contacts.contacts.detail': () => <ContactDetailScreen />,
  'contacts.contacts.form': () => <ContactFormScreen />,
  'contacts.transactions.form': () => <ContactTransactionFormScreen />,
  'contacts.persons.form': () => <ContactPersonFormScreen />,
  'contacts.addresses.form': () => <ContactAddressFormScreen />,
  'contacts.activities.form': () => <ContactActivityFormScreen />,
  'contacts.opportunities': () => <OpportunitiesScreen />,
  'contacts.opportunities.detail': () => <OpportunityDetailScreen />,
  'contacts.opportunities.form': () => <OpportunityFormScreen />,
  'contacts.groups': () => <ContactGroupsScreen />,
  'contacts.groups.detail': () => <ContactGroupDetailScreen />,
  'contacts.pipeline': () => <PipelineBoardScreen />,
  'contacts.crm': () => <CrmDashboardScreen />,
  'contacts.my-work': () => <MyWorkScreen />,
  'contacts.notifications': () => <NotificationsScreen />,
  'contacts.leads': () => <LeadsScreen />,
  'contacts.integrations': () => <IntegrationsSettingsScreen />,
  'contacts.pipelines.settings': () => <PipelineSettingsScreen />,
  'contacts.pipelines.stage.form': () => <PipelineStageFormScreen />,
  'contacts.fields': () => <CrmFieldsSettingsScreen />,
  'contacts.fields.form': () => <CrmFieldFormScreen />,
  // Fatura (invoices)
  'invoices.home': () => <ModuleHome moduleKey="invoices" />,
  'invoices.invoices': () => <InvoicesScreen />,
  'invoices.invoices.detail': () => <InvoiceDetailScreen />,
  'invoices.invoices.form': () => <InvoiceEntryScreen />,
  // Sipariş (orders): Teklif → Sipariş → İrsaliye → Fatura chain
  'orders.home': () => <ModuleHome moduleKey="orders" />,
  'orders.quotes': () => <OrdersListScreen kind="quote" />,
  'orders.orders': () => <OrdersListScreen kind="order" />,
  'orders.deliveries': () => <OrdersListScreen kind="delivery" />,
  'orders.detail': () => <OrderDetailScreen />,
  'orders.entry': () => <OrderEntryScreen />,
  // Sayım (stocktake): list → detail → barcode counting (CountScanScreen)
  'stocktake.home': () => <ModuleHome moduleKey="stocktake" />,
  'stocktake.counts': () => <StockCountListScreen />,
  'stocktake.detail': () => <StockCountDetailScreen />,
  'stocktake.scan': () => <CountScanScreen />,
  // İK & Bordro (hr): Personel · İzinler · Puantaj · Bordro
  'hr.home': () => <ModuleHome moduleKey="hr" />,
  'hr.employees': () => <EmployeesListScreen />,
  'hr.employee.detail': () => <EmployeeDetailScreen />,
  'hr.employee.entry': () => <EmployeeEntryScreen />,
  'hr.leaves': () => <LeavesScreen />,
  'hr.timesheets': () => <TimesheetScreen />,
  'hr.payroll': () => <PayrollScreen />,
  'hr.payroll.detail': () => <PayrollRunDetailScreen />,
  'hr.payslip': () => <PayslipDetailScreen />,
  'hr.checkin': () => <CheckinScreen />,
  'hr.myschedule': () => <MyScheduleScreen />,
  'hr.shifts': () => <ShiftsScreen />,
  'hr.shift.entry': () => <ShiftEntryScreen />,
  'hr.rotations': () => <RotationsScreen />,
  'hr.rotation.entry': () => <RotationEntryScreen />,
  'hr.schedule': () => <ShiftScheduleScreen />,
  'hr.areas': () => <CheckinAreasScreen />,
  'hr.area.entry': () => <CheckinAreaEntryScreen />,
  'hr.attendance': () => <AttendanceScreen />,
  'hr.attendance.entry': () => <AttendanceEntryScreen />,
  'hr.cards': () => <CardAccessScreen />,
  'hr.card.entry': () => <CardSourceEntryScreen />,
  'hr.employeecard.entry': () => <EmployeeCardEntryScreen />,
  // Geri Bildirim (feedback)
  'feedback.list': () => <FeedbackListScreen />,
  'feedback.detail': () => <FeedbackDetailScreen />,
  // Profil (pseudo-module tab)
  profile: () => <ProfileScreen />,
}

export function renderScreen(key: string): React.ReactElement {
  const factory = SCREENS[key]
  return factory ? factory() : <ModuleHome moduleKey={key} />
}
