// ProductsScreen — inventory products list. Tab root for Envanter. Gated by
// inventory.products.read; write-gated "+" opens the create form; rows → detail.
// Search box + an advanced filter bottom sheet (category, price, status, dynamic
// attribute facets).

import * as React from 'react'
import { Pressable, View } from 'react-native'

import {
  EMPTY_PRODUCT_FILTERS,
  InventoryPermissions,
  advancedFilterCount,
  filterProducts,
  type ProductFilters,
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
import { ProductFilterSheet } from './ProductFilterSheet'

export function ProductsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.productsRead)
  const canWrite = hasPermission(InventoryPermissions.productsWrite)
  const [filters, setFilters] = React.useState<ProductFilters>(EMPTY_PRODUCT_FILTERS)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const products = useAsync(() => api.inventory.products.list(), [], { enabled: canRead })
  // Flat "sellable unit" list: one row per variant (parent hidden), variant-less
  // products show themselves — mirrors the web stock list. The ProductDto list
  // above still powers the advanced-filter facets/sheet.
  const sellable = useAsync(() => api.inventory.products.sellable(), [], { enabled: canRead })
  const categories = useAsync(() => api.inventory.categories.list(), [], {
    enabled: hasPermission(InventoryPermissions.categoriesRead),
  })

  const list = products.data ?? []
  const cats = categories.data ?? []

  // Advanced filters (category + attributes, search excluded) → allowed product
  // ids; the flat sellable rows are then narrowed to those ids and the search.
  const allowedIds = React.useMemo(
    () => new Set(filterProducts(list, { ...filters, search: '' }, cats).map((p) => p.id)),
    [list, filters, cats],
  )
  const q = filters.search.trim().toLocaleLowerCase('tr')
  const rows = React.useMemo(
    () =>
      (sellable.data ?? []).filter((r) => {
        if (!allowedIds.has(r.productId)) return false
        if (q) {
          const hay = `${r.label} ${r.code} ${r.barcode} ${r.categoryName ?? ''}`.toLocaleLowerCase('tr')
          if (!hay.includes(q)) return false
        }
        return true
      }),
    [sellable.data, allowedIds, q],
  )

  const loading = products.loading || sellable.loading
  const error = products.error || sellable.error
  const refreshing = products.refreshing || sellable.refreshing
  const refetch = React.useCallback(() => {
    products.refetch()
    sellable.refetch()
  }, [products, sellable])

  const filterCount = advancedFilterCount(filters)
  const anyFilter = !!filters.search.trim() || filterCount > 0

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
        onRefresh={refetch}
        refreshing={refreshing}
      >
        {/* Search + advanced filter */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
          <View style={{ flex: 1 }}>
            <Input
              icon="search"
              placeholder="Ürün adı, açıklama, barkod…"
              value={filters.search}
              onChangeText={(v) => setFilters((f) => ({ ...f, search: v }))}
            />
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

        {loading ? (
          <SkeletonRows count={6} />
        ) : error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={error} actionLabel="Tekrar dene" onAction={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="box"
            title="Ürün yok"
            description={anyFilter ? 'Filtreyle eşleşen ürün bulunamadı.' : 'Henüz ürün eklenmemiş.'}
            actionLabel={anyFilter ? 'Filtreleri temizle' : canWrite ? 'Yeni ürün' : undefined}
            onAction={
              anyFilter
                ? () => setFilters(EMPTY_PRODUCT_FILTERS)
                : canWrite
                  ? () => nav.navigate('inventory.products.form', {}, 'Yeni ürün')
                  : undefined
            }
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {rows.length} ürün
            </Text>
            <ListCard>
              {rows.map((r) => (
                <ListRow
                  key={r.id}
                  icon="box"
                  title={r.label}
                  subtitle={`${r.code}${r.categoryName ? ` · ${r.categoryName}` : ''}`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text variant="label" weight="semibold">
                        {r.salePrice == null ? '—' : `${r.salePrice} ${r.currency}`}
                      </Text>
                      {r.trackStock ? (
                        <Badge
                          label={`${r.totalStock}${r.unit ? ` ${r.unit}` : ''}`}
                          tone={r.totalStock <= r.minQuantity ? 'destructive' : 'muted'}
                        />
                      ) : null}
                    </View>
                  }
                  onPress={() => nav.navigate('inventory.products.detail', { id: r.productId }, r.label)}
                />
              ))}
            </ListCard>
          </>
        )}

        <ProductFilterSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          products={list}
          categories={cats}
          filters={filters}
          setFilters={setFilters}
        />
      </Screen>
    </PermissionRequired>
  )
}
