// Screen registry — maps screen keys (used by module nav items + navigate())
// to their components. Components read any params from useNav().current.params,
// so every entry is a zero-prop element. Add a screen here when you add a key.

import * as React from 'react'

import { AnalyticsScreen } from '../modules/genel/AnalyticsScreen'
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
import { ProfileScreen } from '../screens/ProfileScreen'
import { ModuleDashboardScreen } from './ModuleDashboardScreen'
import { ModuleHome } from './ModuleHome'

export const SCREENS: Record<string, () => React.ReactElement> = {
  // Generic module dashboard (Panel tab) for modules without a custom one.
  'module.dashboard': () => <ModuleDashboardScreen />,
  // Genel
  'genel.dashboard': () => <DashboardScreen />,
  'genel.analytics': () => <AnalyticsScreen />,
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
  // Profil (pseudo-module tab)
  profile: () => <ProfileScreen />,
}

export function renderScreen(key: string): React.ReactElement {
  const factory = SCREENS[key]
  return factory ? factory() : <ModuleHome moduleKey={key} />
}
