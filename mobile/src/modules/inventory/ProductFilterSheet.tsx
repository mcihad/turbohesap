// ProductFilterSheet — the mobile advanced product filter (bottom sheet). Mirrors
// the web filter sidebar: cascade category tree, attribute facets (lookup keys
// resolved to labels), price/cost, stock status, product info (type, variant,
// brand, unit, currency, weight), barcode, sales channel and status.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  advancedFilterCount,
  attrFacets,
  categoryCheckState,
  distinctValues,
  filterProducts,
  filterableFields,
  toggleCategoryCascade,
  EMPTY_PRODUCT_FILTERS,
  LookupsPermissions,
  PRODUCT_TYPES,
  SalesPermissions,
  type AttrFilter,
  type CategoryCheckState,
  type CategoryDto,
  type CategoryFieldDef,
  type ProductDto,
  type ProductFilters,
  type ProductType,
  type StockStatus,
} from '@turbohesap/shared'

import { Badge, Button, Icon, Input, SegmentedControl, Text } from '../../components'
import { CheckBox, FormSwitchRow } from '../../components/form'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useTheme } from '../../theme/theme-context'
import { PRODUCT_TYPE_LABELS } from './labels'

export function ProductFilterSheet({
  open,
  onClose,
  products,
  categories,
  filters,
  setFilters,
}: {
  open: boolean
  onClose: () => void
  products: ProductDto[]
  categories: CategoryDto[]
  filters: ProductFilters
  setFilters: React.Dispatch<React.SetStateAction<ProductFilters>>
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { hasPermission } = useAuth()
  const channels = useAsync(() => api.sales.channels.list(), [], {
    enabled: hasPermission(SalesPermissions.channelsRead),
  })
  const lookups = useAsync(() => api.lookups.list(), [], {
    enabled: hasPermission(LookupsPermissions.read),
  })

  const lookupLabels = React.useMemo(() => {
    const map: Record<string, Record<string, string>> = {}
    for (const it of lookups.data ?? []) (map[it.list] ??= {})[it.key] = it.value
    return map
  }, [lookups.data])
  const unitLabels = lookupLabels['birim'] ?? {}

  const [catExpanded, setCatExpanded] = React.useState<Set<string>>(new Set())
  const catRows = React.useMemo(
    () => visibleCategoryRows(categories, catExpanded),
    [categories, catExpanded],
  )
  const toggleCatExpand = (id: string) =>
    setCatExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const fields = React.useMemo(
    () => filterableFields(filters.categoryIds, categories),
    [filters.categoryIds, categories],
  )
  const baseSubset = React.useMemo(
    () => filterProducts(products, { ...EMPTY_PRODUCT_FILTERS, search: filters.search, categoryIds: filters.categoryIds }, categories),
    [products, filters.search, filters.categoryIds, categories],
  )
  const facets = React.useMemo(() => attrFacets(baseSubset, fields), [baseSubset, fields])
  const brands = React.useMemo(() => distinctValues(products, (p) => p.brand), [products])
  const units = React.useMemo(() => distinctValues(products, (p) => p.unit), [products])
  const currencies = React.useMemo(() => distinctValues(products, (p) => p.currency), [products])
  const resultCount = React.useMemo(() => filterProducts(products, filters, categories).length, [products, filters, categories])
  const advCount = advancedFilterCount(filters)

  const setAttr = (key: string, patch: Partial<AttrFilter>) =>
    setFilters((f) => ({ ...f, attrs: { ...f.attrs, [key]: { ...f.attrs[key], ...patch } } }))
  const num = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v))
  const toggleArr = (arr: string[] | undefined, v: string): string[] => {
    const cur = arr ?? []
    return cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
  }
  const stockVal: 'all' | StockStatus = filters.stockStatus ?? 'all'
  const variantVal: 'all' | 'yes' | 'no' = filters.hasVariants === true ? 'yes' : filters.hasVariants === false ? 'no' : 'all'

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: t.colors.background, borderTopLeftRadius: t.radius['2xl'], borderTopRightRadius: t.radius['2xl'], paddingTop: t.spacing[3], maxHeight: '92%' }}>
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
              <Text variant="title" weight="semibold">Filtrele</Text>
              {advCount > 0 ? <Badge label={String(advCount)} tone="primary" /> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[4], gap: t.spacing[5] }}>
            {/* Category tree (cascade) */}
            <Group title="Kategori">
              <Boxed>
                {catRows.length === 0 ? (
                  <Text variant="caption" tone="muted" style={{ padding: t.spacing[3] }}>Kategori yok.</Text>
                ) : (
                  catRows.map((row, i) => (
                    <CatRow
                      key={row.cat.id}
                      first={i === 0}
                      label={row.cat.name}
                      depth={row.depth}
                      state={categoryCheckState(row.cat.id, filters.categoryIds, categories)}
                      branch={row.isBranch}
                      open={row.isOpen}
                      onToggleExpand={() => toggleCatExpand(row.cat.id)}
                      onToggleCheck={() => setFilters((f) => ({ ...f, categoryIds: toggleCategoryCascade(f.categoryIds, row.cat.id, categories) }))}
                    />
                  ))
                )}
              </Boxed>
            </Group>

            {/* Dynamic attribute facets */}
            {fields.length === 0 ? (
              <Text variant="caption" tone="muted" style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: t.colors.border, borderRadius: t.radius.lg, padding: t.spacing[3] }}>
                Ürüne özel alanlara göre filtrelemek için bir kategori seçin.
              </Text>
            ) : (
              fields.map((def) => (
                <Group key={def.key} title={def.label}>
                  <AttrControl
                    def={def}
                    value={filters.attrs[def.key] ?? {}}
                    options={facets[def.key] ?? []}
                    labelFor={(v) => (def.type === 'lookup' && def.lookupList ? lookupLabels[def.lookupList]?.[v] ?? v : v)}
                    onChange={(patch) => setAttr(def.key, patch)}
                  />
                </Group>
              ))
            )}

            {/* Price & cost */}
            <Group title="Satış fiyatı">
              <RangeRow min={filters.priceMin} max={filters.priceMax} onMin={(v) => setFilters((f) => ({ ...f, priceMin: v }))} onMax={(v) => setFilters((f) => ({ ...f, priceMax: v }))} />
            </Group>
            <Group title="Alış fiyatı">
              <RangeRow min={filters.purchaseMin} max={filters.purchaseMax} onMin={(v) => setFilters((f) => ({ ...f, purchaseMin: v }))} onMax={(v) => setFilters((f) => ({ ...f, purchaseMax: v }))} />
            </Group>

            {/* Stock status */}
            <Group title="Stok durumu">
              <SegmentedControl<'all' | StockStatus>
                value={stockVal}
                onChange={(v) => setFilters((f) => ({ ...f, stockStatus: v === 'all' ? undefined : v }))}
                options={[
                  { value: 'all', label: 'Hepsi' },
                  { value: 'in', label: 'Stokta' },
                  { value: 'out', label: 'Tükendi' },
                  { value: 'low', label: 'Az' },
                ]}
              />
            </Group>

            {/* Product type */}
            <Group title="Tür">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] }}>
                {PRODUCT_TYPES.map((ty) => {
                  const on = (filters.types ?? []).includes(ty)
                  return (
                    <Button
                      key={ty}
                      title={PRODUCT_TYPE_LABELS[ty as ProductType]}
                      size="sm"
                      variant={on ? 'default' : 'outline'}
                      onPress={() => setFilters((f) => ({ ...f, types: (toggleArr(f.types, ty) as ProductType[]) }))}
                    />
                  )
                })}
              </View>
            </Group>

            {/* Variant */}
            <Group title="Varyant">
              <SegmentedControl<'all' | 'yes' | 'no'>
                value={variantVal}
                onChange={(v) => setFilters((f) => ({ ...f, hasVariants: v === 'all' ? undefined : v === 'yes' }))}
                options={[
                  { value: 'all', label: 'Hepsi' },
                  { value: 'yes', label: 'Varyantlı' },
                  { value: 'no', label: 'Tekil' },
                ]}
              />
            </Group>

            {/* Brand */}
            {brands.length > 0 ? (
              <Group title="Marka">
                <Boxed>
                  {brands.map((b, i) => (
                    <CheckRow key={b} first={i === 0} label={b} leading={<CheckBox checked={(filters.brands ?? []).includes(b)} />} active={(filters.brands ?? []).includes(b)} onPress={() => setFilters((f) => ({ ...f, brands: toggleArr(f.brands, b) }))} />
                  ))}
                </Boxed>
              </Group>
            ) : null}

            {/* Unit */}
            {units.length > 0 ? (
              <Group title="Birim">
                <Boxed>
                  {units.map((u, i) => (
                    <CheckRow key={u} first={i === 0} label={unitLabels[u] ?? u} leading={<CheckBox checked={(filters.units ?? []).includes(u)} />} active={(filters.units ?? []).includes(u)} onPress={() => setFilters((f) => ({ ...f, units: toggleArr(f.units, u) }))} />
                  ))}
                </Boxed>
              </Group>
            ) : null}

            {/* Currency */}
            {currencies.length > 1 ? (
              <Group title="Para birimi">
                <Boxed>
                  {currencies.map((c, i) => (
                    <CheckRow key={c} first={i === 0} label={c} leading={<CheckBox checked={(filters.currencies ?? []).includes(c)} />} active={(filters.currencies ?? []).includes(c)} onPress={() => setFilters((f) => ({ ...f, currencies: toggleArr(f.currencies, c) }))} />
                  ))}
                </Boxed>
              </Group>
            ) : null}

            {/* Weight */}
            <Group title="Ağırlık (kg)">
              <RangeRow min={filters.weightMin} max={filters.weightMax} onMin={(v) => setFilters((f) => ({ ...f, weightMin: v }))} onMax={(v) => setFilters((f) => ({ ...f, weightMax: v }))} />
            </Group>

            {/* Barcode */}
            <Group title="Barkod">
              <Input placeholder="Barkod (alt barkodlar dahil)" value={filters.barcode ?? ''} onChangeText={(v) => setFilters((f) => ({ ...f, barcode: v || undefined }))} />
            </Group>

            {/* Sales channels */}
            {(channels.data ?? []).length > 0 ? (
              <Group title="Satış kanalı">
                <Boxed>
                  {(channels.data ?? []).map((c, i) => (
                    <CheckRow key={c.id} first={i === 0} label={c.name} leading={<CheckBox checked={(filters.channelIds ?? []).includes(c.id)} />} active={(filters.channelIds ?? []).includes(c.id)} onPress={() => setFilters((f) => ({ ...f, channelIds: toggleArr(f.channelIds, c.id) }))} />
                  ))}
                </Boxed>
              </Group>
            ) : null}

            {/* Status */}
            <Group title="Durum">
              <FormSwitchRow label="Sadece aktif ürünler" value={filters.activeOnly} onValueChange={(v) => setFilters((f) => ({ ...f, activeOnly: v }))} />
            </Group>
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], paddingHorizontal: t.spacing[5], paddingTop: t.spacing[3], paddingBottom: insets.bottom + t.spacing[3], borderTopWidth: 1, borderTopColor: t.colors.border }}>
            <Button title="Sıfırla" variant="ghost" size="sm" onPress={() => setFilters((f) => ({ ...EMPTY_PRODUCT_FILTERS, search: f.search }))} />
            <View style={{ flex: 1 }} />
            <Button title={`${resultCount} ürünü göster`} size="sm" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

function Boxed({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  return <View style={{ borderWidth: 1, borderColor: t.colors.border, borderRadius: t.radius.lg, overflow: 'hidden' }}>{children}</View>
}

function CheckRow({
  label,
  leading,
  active,
  onPress,
  first,
  depth = 0,
}: {
  label: string
  leading: React.ReactNode
  active: boolean
  onPress: () => void
  first: boolean
  depth?: number
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[2.5],
        paddingVertical: t.spacing[2.5],
        paddingRight: t.spacing[3],
        paddingLeft: t.spacing[3] + depth * 16,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.colors.border,
      }}
    >
      {leading}
      <Text variant="label" weight={active ? 'semibold' : 'normal'} numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  )
}

function RangeRow({
  min,
  max,
  onMin,
  onMax,
}: {
  min?: number
  max?: number
  onMin: (v: number | undefined) => void
  onMax: (v: number | undefined) => void
}) {
  const t = useTheme()
  const num = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v))
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
      <View style={{ flex: 1 }}>
        <Input placeholder="En az" keyboardType="decimal-pad" value={min?.toString() ?? ''} onChangeText={(v) => onMin(num(v))} />
      </View>
      <Text tone="muted">–</Text>
      <View style={{ flex: 1 }}>
        <Input placeholder="En çok" keyboardType="decimal-pad" value={max?.toString() ?? ''} onChangeText={(v) => onMax(num(v))} />
      </View>
    </View>
  )
}

interface CatRowData {
  cat: CategoryDto
  depth: number
  isBranch: boolean
  isOpen: boolean
}

// Flatten the category tree to the currently-visible rows (collapsed branches
// hide their children).
function visibleCategoryRows(categories: CategoryDto[], expanded: Set<string>): CatRowData[] {
  const byParent = new Map<string | null, CategoryDto[]>()
  for (const c of categories) {
    const a = byParent.get(c.parentId) ?? []
    a.push(c)
    byParent.set(c.parentId, a)
  }
  const out: CatRowData[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const c of (byParent.get(parentId) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr'),
    )) {
      const isBranch = (byParent.get(c.id) ?? []).length > 0
      const isOpen = expanded.has(c.id)
      out.push({ cat: c, depth, isBranch, isOpen })
      if (isBranch && isOpen) walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

function CatRow({
  label,
  depth,
  state,
  branch,
  open,
  onToggleExpand,
  onToggleCheck,
  first,
}: {
  label: string
  depth: number
  state: CategoryCheckState
  branch: boolean
  open: boolean
  onToggleExpand: () => void
  onToggleCheck: () => void
  first: boolean
}) {
  const t = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: t.spacing[3],
        paddingLeft: t.spacing[2] + depth * 16,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.colors.border,
      }}
    >
      {branch ? (
        <Pressable onPress={onToggleExpand} hitSlop={6} style={{ width: 30, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={18} color={t.colors.mutedForeground} />
        </Pressable>
      ) : (
        <View style={{ width: 30 }} />
      )}
      <Pressable onPress={onToggleCheck} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.spacing[2.5], paddingVertical: t.spacing[2.5] }}>
        <TriBox state={state} />
        <Text variant="label" weight={state !== 'none' ? 'semibold' : 'normal'} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
      </Pressable>
    </View>
  )
}

function TriBox({ state }: { state: CategoryCheckState }) {
  const t = useTheme()
  const filled = state !== 'none'
  return (
    <View style={{ width: 22, height: 22, borderRadius: t.radius.sm, borderWidth: filled ? 0 : 1.5, borderColor: t.colors.inputBorder, backgroundColor: filled ? t.colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {state === 'checked' ? (
        <Icon name="check" size={15} color={t.colors.primaryForeground} />
      ) : state === 'indeterminate' ? (
        <Icon name="minus" size={15} color={t.colors.primaryForeground} />
      ) : null}
    </View>
  )
}

function AttrControl({
  def,
  value,
  options,
  labelFor,
  onChange,
}: {
  def: CategoryFieldDef
  value: AttrFilter
  options: string[]
  labelFor: (value: string) => string
  onChange: (patch: Partial<AttrFilter>) => void
}) {
  if (def.type === 'number' || def.type === 'money') {
    return <RangeRow min={value.min} max={value.max} onMin={(v) => onChange({ min: v })} onMax={(v) => onChange({ max: v })} />
  }

  if (def.type === 'boolean') {
    const cur = value.bool === true ? 'yes' : value.bool === false ? 'no' : 'all'
    return (
      <SegmentedControl<'all' | 'yes' | 'no'>
        value={cur}
        onChange={(v) => onChange({ bool: v === 'all' ? undefined : v === 'yes' })}
        options={[{ value: 'all', label: 'Hepsi' }, { value: 'yes', label: 'Evet' }, { value: 'no', label: 'Hayır' }]}
      />
    )
  }

  if (def.type === 'select' || def.type === 'lookup' || def.type === 'multiselect') {
    const sel = value.values ?? []
    if (options.length === 0) return <Text variant="caption" tone="muted">Seçenek yok.</Text>
    return (
      <Boxed>
        {options.map((opt, i) => (
          <CheckRow
            key={opt}
            first={i === 0}
            label={labelFor(opt)}
            leading={<CheckBox checked={sel.includes(opt)} />}
            active={sel.includes(opt)}
            onPress={() => onChange({ values: sel.includes(opt) ? sel.filter((x) => x !== opt) : [...sel, opt] })}
          />
        ))}
      </Boxed>
    )
  }

  return <Input placeholder="İçeren…" value={value.text ?? ''} onChangeText={(v) => onChange({ text: v })} />
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme()
  return (
    <View style={{ gap: t.spacing[2] }}>
      <Text variant="overline" tone="muted">{title}</Text>
      {children}
    </View>
  )
}
