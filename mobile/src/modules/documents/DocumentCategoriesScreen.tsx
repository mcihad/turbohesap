// DocumentCategoriesScreen — read-only browse of the evrak category tree (an
// indented list, no native tree widget — mirrors inventory's CategoriesScreen).
// Creating/editing categories and their fieldDefs schema is a desk-only task
// (matches the existing mobile-scope-reduction pattern for schema-heavy admin
// work); tapping a row filters the documents list by that category instead of
// opening a category detail/edit screen.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import { DocumentsPermissions } from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
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

export function DocumentCategoriesScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(DocumentsPermissions.categoriesRead)
  const cats = useAsync(() => api.documents.categories.list(), [], { enabled: canRead })
  const flat = React.useMemo(() => flattenCategories(cats.data ?? []), [cats.data])

  return (
    <PermissionRequired permission={DocumentsPermissions.categoriesRead} title="Kategoriler" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Kategoriler',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
        }}
        onRefresh={cats.refetch}
        refreshing={cats.refreshing}
      >
        {cats.loading ? (
          <SkeletonRows count={6} />
        ) : cats.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={cats.error} actionLabel="Tekrar dene" onAction={cats.refetch} />
        ) : flat.length === 0 ? (
          <EmptyState icon="folder" title="Kategori yok" description="Henüz evrak kategorisi tanımlanmamış." />
        ) : (
          <ListCard>
            {flat.map(({ cat, depth }) => (
              <Pressable
                key={cat.id}
                onPress={() => nav.navigate('documents.documents', { categoryId: cat.id }, cat.name)}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1.5] }}>
                    <Text variant="label" weight="semibold" numberOfLines={1}>
                      {cat.name}
                    </Text>
                    {cat.isPrivate ? <Icon name="lock" size={13} color={t.colors.mutedForeground} /> : null}
                  </View>
                  {cat.code ? (
                    <Text variant="caption" tone="muted">
                      {cat.code}
                    </Text>
                  ) : null}
                </View>
                <Badge label={String(cat.documentCount)} tone="primary" />
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
