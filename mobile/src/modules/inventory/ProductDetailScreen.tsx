// ProductDetailScreen — read-only product detail. Edit (write), delete (the
// separate inventory.products.delete permission), audit history (audit.read).

import * as React from 'react'
import { View } from 'react-native'

import {
  InventoryPermissions,
  IamPermissions,
  type CategoryFieldDef,
  effectiveFieldDefsWithSource,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  type DetailTab,
  DetailTabs,
  EmptyState,
  Field,
  FieldGrid,
  HeaderAction,
  Screen,
  Section,
  Skeleton,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate, formatDateTime } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { money, productTypeLabel } from './labels'
import {
  ChannelPricesSection,
  PackagingsSection,
  StockSection,
  VariantsSection,
} from './product-detail-sections'

export function ProductDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.productsWrite)
  const canDelete = hasPermission(InventoryPermissions.productsDelete)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const id = String(nav.current.params?.id ?? '')
  const product = useAsync(() => api.inventory.products.get(id), [id], {
    enabled: hasPermission(InventoryPermissions.productsRead) && !!id,
  })
  const categories = useAsync(() => api.inventory.categories.list(), [], {
    enabled: hasPermission(InventoryPermissions.categoriesRead),
  })
  const { submit, busy } = useSubmit()
  const p = product.data
  const [tab, setTab] = React.useState('genel')

  // Resolve the product's custom attributes against its category's field defs so
  // each is shown with its proper label/format, grouped by source category.
  const attrGroups = React.useMemo(() => {
    if (!p) return [] as { id: string; name: string; fields: { def: CategoryFieldDef; value: unknown }[] }[]
    const sourced = effectiveFieldDefsWithSource(p.categoryId, categories.data ?? [])
    const used = new Set<string>()
    const groups: { id: string; name: string; fields: { def: CategoryFieldDef; value: unknown }[] }[] = []
    for (const sf of sourced) {
      const value = p.attributes?.[sf.def.key]
      if (value === undefined || value === '' || value === null) continue
      used.add(sf.def.key)
      let g = groups.find((x) => x.id === sf.sourceCategoryId)
      if (!g) {
        g = { id: sf.sourceCategoryId, name: sf.sourceName, fields: [] }
        groups.push(g)
      }
      g.fields.push({ def: sf.def, value })
    }
    // Orphan attributes (no matching def) → a fallback group.
    const orphans = Object.entries(p.attributes ?? {}).filter(([k, v]) => !used.has(k) && v !== '' && v != null)
    if (orphans.length) {
      groups.push({ id: '__other__', name: 'Diğer', fields: orphans.map(([k, value]) => ({ def: { key: k, label: k, type: 'text', required: false } as CategoryFieldDef, value })) })
    }
    return groups
  }, [p, categories.data])

  if (!hasPermission(InventoryPermissions.productsRead)) {
    return (
      <Screen header={{ title: 'Ürün', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: p?.name ?? 'Ürün',
        subtitle: p?.code,
        onBack: nav.goBack,
        right: p ? (
          <>
            {canAudit ? (
              <HeaderAction icon="clock" onPress={() => nav.navigate('iam.audit.entity', { entityType: 'Product', entityId: p.id, title: p.name }, 'Denetim geçmişi')} />
            ) : null}
            {canWrite ? (
              <HeaderAction icon="edit-2" onPress={() => nav.navigate('inventory.products.form', { id: p.id }, p.name)} />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={product.refetch}
      refreshing={product.refreshing}
    >
      {product.loading ? (
        <Card style={{ gap: t.spacing[3] }}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="40%" height={13} />
        </Card>
      ) : product.error || !p ? (
        <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={product.error ?? 'Ürün bulunamadı.'} actionLabel="Tekrar dene" onAction={product.refetch} />
      ) : (
        (() => {
          // Tab set — conditional sections appear only when relevant, mirroring
          // the web product detail tabs.
          const tabs: DetailTab[] = [
            { value: 'genel', label: 'Genel', icon: 'info' },
            ...(attrGroups.length ? [{ value: 'ozellikler', label: 'Özellikler', icon: 'list' } as DetailTab] : []),
            ...(p.hasVariants ? [{ value: 'varyantlar', label: `Varyantlar (${p.variantCount})`, icon: 'layers' } as DetailTab] : []),
            ...(p.trackStock ? [{ value: 'stok', label: 'Stok', icon: 'archive' } as DetailTab] : []),
            { value: 'fiyatlar', label: 'Kanal fiyatları', icon: 'tag' },
            { value: 'paketler', label: 'Paketler', icon: 'package' },
          ]
          const active = tabs.some((x) => x.value === tab) ? tab : 'genel'

          return (
            <>
              <DetailTabs tabs={tabs} value={active} onChange={setTab} />

              {active === 'genel' ? (
                <>
                  <Section title="Genel">
                    <Card style={{ gap: t.spacing[4] }}>
                      <View style={{ flexDirection: 'row', gap: t.spacing[1.5] }}>
                        <Badge label={p.isActive ? 'Aktif' : 'Pasif'} tone={p.isActive ? 'success' : 'muted'} />
                        {p.category ? <Badge label={p.category.name} tone="primary" /> : null}
                      </View>
                      <FieldGrid>
                        <Field label="Kod" value={p.code} mono />
                        <Field label="Tür" value={productTypeLabel(p.type)} />
                        <Field label="Birim" value={p.unit || '—'} />
                        <Field label="Marka" value={p.brand || '—'} />
                        <Field label="Barkod" value={p.barcode || '—'} mono />
                        <Field label="Ağırlık" value={p.weight == null ? '—' : `${p.weight} kg`} />
                        {p.description ? <Field label="Açıklama" value={p.description} full /> : null}
                      </FieldGrid>
                    </Card>
                  </Section>

                  <Section title="Fiyat ve stok">
                    <Card>
                      <FieldGrid>
                        <Field label="Alış" value={money(p.purchasePrice, p.currency)} />
                        <Field label="Satış" value={money(p.salePrice, p.currency)} />
                        <Field label="KDV" value={p.taxRate == null ? '—' : `%${p.taxRate}`} />
                        <Field label="Para birimi" value={p.currency} />
                        <Field
                          label="Toplam stok"
                          value={p.trackStock ? `${p.totalStock}${p.unit ? ` ${p.unit}` : ''}` : '—'}
                        />
                        <Field label="Min. stok" value={String(p.minQuantity)} />
                      </FieldGrid>
                    </Card>
                  </Section>

                  <Section title="Kayıt">
                    <Card>
                      <FieldGrid>
                        <Field label="Oluşturma" value={formatDateTime(p.createdAt)} />
                        <Field label="Güncelleme" value={formatDateTime(p.updatedAt)} />
                      </FieldGrid>
                    </Card>
                  </Section>

                  {canDelete ? (
                    <Button
                      title="Ürünü sil"
                      variant="outline"
                      icon="trash-2"
                      fullWidth
                      loading={busy}
                      onPress={() =>
                        confirmDestructive('Ürünü sil', `"${p.name}" silinsin mi?`, () =>
                          submit(() => api.inventory.products.remove(p.id), { onSuccess: nav.goBack }),
                        )
                      }
                      style={{ marginTop: t.spacing[2] }}
                    />
                  ) : null}
                </>
              ) : null}

              {active === 'ozellikler' ? (
                <Section title="Kategoriye özel alanlar">
                  {attrGroups.map((g) => (
                    <Card key={g.id} style={{ gap: t.spacing[3] }}>
                      <View style={{ flexDirection: 'row' }}>
                        <Badge label={g.name || 'Kategori'} tone="primary" />
                      </View>
                      <FieldGrid>
                        {g.fields.map(({ def, value }) => (
                          <Field key={def.key} label={def.label} value={formatAttr(def, value)} />
                        ))}
                      </FieldGrid>
                    </Card>
                  ))}
                </Section>
              ) : null}

              {active === 'varyantlar' ? <VariantsSection product={p} onChanged={product.refetch} /> : null}
              {active === 'stok' ? <StockSection product={p} onChanged={product.refetch} /> : null}
              {active === 'fiyatlar' ? <ChannelPricesSection product={p} onChanged={product.refetch} /> : null}
              {active === 'paketler' ? <PackagingsSection product={p} onChanged={product.refetch} /> : null}
            </>
          )
        })()
      )}
    </Screen>
  )
}

// Format a custom attribute value according to its field definition's type, so a
// date range reads "1 Oca 2026 – 31 Oca 2026" instead of raw JSON, etc.
function formatAttr(def: CategoryFieldDef, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  switch (def.type) {
    case 'boolean':
      return v ? 'Evet' : 'Hayır'
    case 'date':
      return formatDate(String(v))
    case 'daterange': {
      const r = (typeof v === 'object' ? v : {}) as { from?: string; to?: string }
      if (!r.from && !r.to) return '—'
      return `${r.from ? formatDate(r.from) : '…'} – ${r.to ? formatDate(r.to) : '…'}`
    }
    case 'multiselect':
      return Array.isArray(v) ? v.join(', ') : String(v)
    case 'money':
      return `${v}${def.currency ? ` ${def.currency}` : ''}`
    case 'number':
      return `${v}${def.unit ? ` ${def.unit}` : ''}`
    default:
      if (Array.isArray(v)) return v.join(', ')
      if (typeof v === 'object') return JSON.stringify(v)
      return String(v)
  }
}
