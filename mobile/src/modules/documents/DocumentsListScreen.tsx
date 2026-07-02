// DocumentsListScreen — the evrak list. Tab root for Evrak (also reached with a
// preset `categoryId` param from DocumentCategoriesScreen). Search + an advanced
// filter bottom sheet; filtering is server-side (GET /documents/documents
// already accepts categoryId/tag/isPrivate/mine/expiryStatus/search — privacy is
// enforced there too, so a caller without documents.private.readAll simply never
// receives another user's private rows).

import * as React from 'react'
import { Pressable, View } from 'react-native'

import {
  DocumentsPermissions,
  type DocumentExpiryStatus,
  type DocumentListQuery,
} from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
  HeaderAction,
  Icon,
  Input,
  ListCard,
  ListRow,
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
import { DocumentFilterSheet, documentFilterCount } from './DocumentFilterSheet'
import { expiryStatusLabel, expiryStatusTone } from './labels'

export interface DocumentFilters {
  categoryId: string | null
  tag: string | null
  expiryStatus: DocumentExpiryStatus | null
  mine: boolean
  /** true = only kişiye özel (private) documents; null = no filter. */
  isPrivate: boolean | null
}

export const EMPTY_DOCUMENT_FILTERS: DocumentFilters = {
  categoryId: null,
  tag: null,
  expiryStatus: null,
  mine: false,
  isPrivate: null,
}

export function DocumentsListScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(DocumentsPermissions.documentsRead)
  const canWrite = hasPermission(DocumentsPermissions.documentsWrite)
  const canReadCategories = hasPermission(DocumentsPermissions.categoriesRead)
  const canPrivateReadAll = hasPermission(DocumentsPermissions.privateReadAll)

  const presetCategoryId = nav.current.params?.categoryId ? String(nav.current.params.categoryId) : null
  const [search, setSearch] = React.useState('')
  const [filters, setFilters] = React.useState<DocumentFilters>({
    ...EMPTY_DOCUMENT_FILTERS,
    categoryId: presetCategoryId,
  })
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const query: DocumentListQuery = React.useMemo(
    () => ({
      categoryId: filters.categoryId ?? undefined,
      tag: filters.tag ?? undefined,
      expiryStatus: filters.expiryStatus ?? undefined,
      mine: filters.mine || undefined,
      isPrivate: filters.isPrivate ?? undefined,
      search: search.trim() || undefined,
    }),
    [filters, search],
  )

  const docs = useAsync(
    () => api.documents.documents.list(query),
    [query.categoryId, query.tag, query.expiryStatus, query.mine, query.isPrivate, query.search],
    { enabled: canRead },
  )
  const categories = useAsync(() => api.documents.categories.list(), [], { enabled: canReadCategories })
  const tags = useAsync(() => api.documents.tags.list(), [], { enabled: canRead })

  const rows = docs.data ?? []
  const filterCount = documentFilterCount(filters)
  const activeCategoryName = filters.categoryId
    ? (categories.data ?? []).find((c) => c.id === filters.categoryId)?.name
    : null

  return (
    <PermissionRequired permission={DocumentsPermissions.documentsRead} title="Evraklar" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Evraklar',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('documents.form', {}, 'Yeni evrak')} />
          ) : undefined,
        }}
        onRefresh={docs.refetch}
        refreshing={docs.refreshing}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
          <View style={{ flex: 1 }}>
            <Input icon="search" placeholder="Evrak adı, açıklama, kod…" value={search} onChangeText={setSearch} />
          </View>
          <Pressable
            onPress={() => setSheetOpen(true)}
            style={({ pressed }) => [
              {
                width: 48,
                height: 48,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: filterCount > 0 ? t.colors.primary : t.colors.inputBorder,
                backgroundColor: filterCount > 0 ? t.colors.primarySoft : t.colors.card,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Icon name="sliders" size={20} color={filterCount > 0 ? t.colors.primary : t.colors.mutedForeground} />
            {filterCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 4,
                  borderRadius: 9,
                  backgroundColor: t.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="caption" weight="bold" style={{ color: t.colors.primaryForeground, fontSize: 10 }}>
                  {filterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {activeCategoryName ? (
          <Pressable
            onPress={() => setFilters((f) => ({ ...f, categoryId: null }))}
            style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: t.spacing[1.5] }}
          >
            <Badge label={`Kategori: ${activeCategoryName}`} tone="primary" />
            <Icon name="x" size={14} color={t.colors.mutedForeground} />
          </Pressable>
        ) : null}

        {docs.loading ? (
          <SkeletonRows count={6} />
        ) : docs.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={docs.error} actionLabel="Tekrar dene" onAction={docs.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="Evrak yok"
            description={filterCount > 0 || search.trim() ? 'Filtreyle eşleşen evrak bulunamadı.' : 'Henüz evrak eklenmemiş.'}
            actionLabel={filterCount > 0 ? 'Filtreleri temizle' : canWrite ? 'Yeni evrak' : undefined}
            onAction={
              filterCount > 0
                ? () => setFilters(EMPTY_DOCUMENT_FILTERS)
                : canWrite
                  ? () => nav.navigate('documents.form', {}, 'Yeni evrak')
                  : undefined
            }
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {rows.length} evrak
            </Text>
            <ListCard>
              {rows.map((d) => (
                <ListRow
                  key={d.id}
                  icon="file-text"
                  title={d.title}
                  subtitle={[d.categoryName, d.code].filter(Boolean).join(' · ') || undefined}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4, flexDirection: 'row' }}>
                      {d.isPrivate ? <Icon name="lock" size={14} color={t.colors.mutedForeground} /> : null}
                      {d.expiryStatus !== 'none' ? (
                        <Badge label={expiryStatusLabel(d.expiryStatus)} tone={expiryStatusTone(d.expiryStatus)} />
                      ) : null}
                    </View>
                  }
                  onPress={() => nav.navigate('documents.detail', { id: d.id }, d.title)}
                />
              ))}
            </ListCard>
          </>
        )}

        <DocumentFilterSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          categories={categories.data ?? []}
          tags={tags.data ?? []}
          filters={filters}
          setFilters={setFilters}
          canPrivateReadAll={canPrivateReadAll}
        />
      </Screen>
    </PermissionRequired>
  )
}
