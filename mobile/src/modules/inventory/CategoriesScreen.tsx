// CategoriesScreen — the category tree as an indented list (no native tree
// widget). Gated by inventory.categories.read; write-gated "+" creates a root;
// rows → category detail.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import { InventoryPermissions } from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
  HeaderAction,
  Icon,
  ListCard,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { flattenCategories } from './labels'

export function CategoriesScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.categoriesRead)
  const canWrite = hasPermission(InventoryPermissions.categoriesWrite)
  const cats = useAsync(() => api.inventory.categories.list(), [], { enabled: canRead })
  const flat = React.useMemo(() => flattenCategories(cats.data ?? []), [cats.data])

  return (
    <PermissionRequired permission={InventoryPermissions.categoriesRead} title="Kategoriler" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Kategoriler',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('inventory.category.form', { newRoot: true }, 'Yeni kategori')} />
          ) : undefined,
        }}
        onRefresh={cats.refetch}
        refreshing={cats.refreshing}
      >
        {cats.loading ? (
          <SkeletonRows count={6} />
        ) : cats.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={cats.error} actionLabel="Tekrar dene" onAction={cats.refetch} />
        ) : flat.length === 0 ? (
          <EmptyState
            icon="folder"
            title="Kategori yok"
            description="Henüz kategori yok."
            actionLabel={canWrite ? 'Yeni kategori' : undefined}
            onAction={canWrite ? () => nav.navigate('inventory.category.form', { newRoot: true }, 'Yeni kategori') : undefined}
          />
        ) : (
          <ListCard>
            {flat.map(({ cat, depth }) => (
              <Pressable
                key={cat.id}
                onPress={() => nav.navigate('inventory.category.detail', { id: cat.id }, cat.name)}
                android_ripple={{ color: t.colors.muted }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing[2.5],
                  paddingVertical: t.spacing[3],
                  paddingRight: t.spacing[4],
                  paddingLeft: t.spacing[4] + depth * 18,
                  backgroundColor: pressed ? t.colors.muted : 'transparent',
                })}
              >
                <Icon name={depth === 0 ? 'folder' : 'corner-down-right'} size={18} color={depth === 0 ? t.colors.primary : t.colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text variant="label" weight="semibold" numberOfLines={1}>
                    {cat.name}
                  </Text>
                  {cat.code ? (
                    <Text variant="caption" tone="muted">
                      {cat.code}
                    </Text>
                  ) : null}
                </View>
                {cat.fieldDefs.length > 0 ? <Badge label={`${cat.fieldDefs.length} alan`} tone="primary" /> : null}
                {!cat.isActive ? <Badge label="Pasif" tone="muted" /> : null}
                <Icon name="chevron-right" size={18} color={t.colors.mutedForeground} />
              </Pressable>
            ))}
          </ListCard>
        )}
      </Screen>
    </PermissionRequired>
  )
}
