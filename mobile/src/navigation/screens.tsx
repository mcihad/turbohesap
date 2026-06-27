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
  // Profil (pseudo-module tab)
  profile: () => <ProfileScreen />,
}

export function renderScreen(key: string): React.ReactElement {
  const factory = SCREENS[key]
  return factory ? factory() : <ModuleHome moduleKey={key} />
}
