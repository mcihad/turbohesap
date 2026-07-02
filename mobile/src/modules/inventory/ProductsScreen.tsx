// ProductsScreen — inventory products list. Tab root for Envanter. Gated by
// inventory.products.read; write-gated "+" opens the create form; rows → detail.
// Server-paginated (usePaginated over products.listPage) with a server-side
// search box. (Advanced faceted filtering / per-variant "sellable" view are
// deferred here, matching the web products grid.)

import * as React from 'react'
import { View } from 'react-native'

import { InventoryPermissions } from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
  HeaderAction,
  Input,
  ListCard,
  ListRow,
  LoadMoreFooter,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useDebouncedValue } from '../../lib/use-debounced-value'
import { usePaginated } from '../../lib/use-paginated'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

export function ProductsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.productsRead)
  const canWrite = hasPermission(InventoryPermissions.productsWrite)
  const [query, setQuery] = React.useState('')
  const search = useDebouncedValue(query.trim(), 350)

  const products = usePaginated(
    (page) => api.inventory.products.listPage({ page, pageSize: 30, search: search || undefined }),
    [search],
    { enabled: canRead },
  )
  const items = products.items

  return (
    <PermissionRequired permission={InventoryPermissions.productsRead} title="Ürünler" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Ürünler',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('inventory.products.form', {}, 'Yeni ürün')} />
          ) : undefined,
        }}
        onRefresh={products.refresh}
        refreshing={products.refreshing}
        onEndReached={products.loadMore}
      >
        <Input
          icon="search"
          placeholder="Ürün adı, açıklama, kod, barkod…"
          value={query}
          onChangeText={setQuery}
        />

        {products.loading ? (
          <SkeletonRows count={6} />
        ) : products.error && items.length === 0 ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={products.error} actionLabel="Tekrar dene" onAction={products.refresh} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="box"
            title="Ürün yok"
            description={query ? 'Eşleşen ürün bulunamadı.' : 'Henüz ürün eklenmemiş.'}
            actionLabel={canWrite && !query ? 'Yeni ürün' : undefined}
            onAction={canWrite && !query ? () => nav.navigate('inventory.products.form', {}, 'Yeni ürün') : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {items.length} / {products.total} ürün
            </Text>
            <ListCard>
              {items.map((p) => (
                <ListRow
                  key={p.id}
                  icon="box"
                  title={p.name}
                  subtitle={`${p.code}${p.category ? ` · ${p.category.name}` : ''}`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text variant="label" weight="semibold">
                        {p.salePrice == null ? '—' : `${p.salePrice} ${p.currency}`}
                      </Text>
                      {p.trackStock ? (
                        <Badge
                          label={`${p.totalStock}${p.unit ? ` ${p.unit}` : ''}`}
                          tone={p.totalStock <= p.minQuantity ? 'destructive' : 'muted'}
                        />
                      ) : null}
                    </View>
                  }
                  onPress={() => nav.navigate('inventory.products.detail', { id: p.id }, p.name)}
                />
              ))}
            </ListCard>
            <LoadMoreFooter loadingMore={products.loadingMore} hasMore={products.hasMore} total={products.total} />
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
