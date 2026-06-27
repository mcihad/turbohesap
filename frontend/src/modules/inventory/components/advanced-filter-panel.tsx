import * as React from 'react'
import {
  Boxes,
  DollarSign,
  ListFilter,
  ScanBarcode,
  SlidersHorizontal,
  Store,
  ToggleLeft,
  Warehouse,
  X,
} from 'lucide-react'

import {
  EMPTY_PRODUCT_FILTERS,
  PRODUCT_TYPES,
  advancedFilterCount,
  type AttrFilter,
  type CategoryDto,
  type CategoryFieldDef,
  type ProductFilters,
  type ProductType,
  type StockStatus,
} from '@turbohesap/shared'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { CategoryCombobox } from './category-combobox'
import { FilterGroup } from './filter-group'
import { PRODUCT_TYPE_LABELS } from '../labels'

interface ChannelOption {
  id: string
  name: string
}

export interface ProductFacetData {
  brands: string[]
  units: string[]
  currencies: string[]
}

const num = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v))

export function AdvancedFilterPanel({
  filters,
  setFilters,
  categories,
  fields,
  facets,
  channels,
  productFacets,
  lookupLabels,
  onClose,
}: {
  filters: ProductFilters
  setFilters: React.Dispatch<React.SetStateAction<ProductFilters>>
  categories: CategoryDto[]
  fields: CategoryFieldDef[]
  facets: Record<string, string[]>
  channels: ChannelOption[]
  productFacets: ProductFacetData
  /** list → key → display label (resolves lookup-keyed values to readable text). */
  lookupLabels: Record<string, Record<string, string>>
  onClose?: () => void
}) {
  const advCount = advancedFilterCount(filters)
  const clearAll = () => setFilters((f) => ({ ...EMPTY_PRODUCT_FILTERS, search: f.search }))
  const unitLabels = lookupLabels['birim'] ?? {}

  return (
    <div className="flex h-full flex-col">
      {/* Header — themed, with a soft accent chip and a live active-count line. */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-gradient-to-b from-muted/50 to-transparent px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
            <SlidersHorizontal className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Filtreler</p>
            <p className="text-2xs text-muted-foreground">{advCount > 0 ? `${advCount} aktif filtre` : 'Tümü gösteriliyor'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {advCount ? <Button variant="ghost" size="sm" onClick={clearAll}>Temizle</Button> : null}
          {onClose ? (
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Kapat">
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto">
        <FilterGroup icon={ListFilter} title="Kategori" count={filters.categoryIds.length} defaultOpen>
          <CategoryCombobox
            categories={categories}
            value={filters.categoryIds}
            onChange={(ids) => setFilters((f) => ({ ...f, categoryIds: ids }))}
          />
        </FilterGroup>

        <FilterGroup
          icon={SlidersHorizontal}
          title="Özellikler"
          count={fields.filter((d) => attrActive(filters.attrs[d.key])).length}
          defaultOpen
        >
          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Ürüne özel alanlara göre filtrelemek için kategori seçin.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((def) => (
                <Field key={def.key} label={def.label}>
                  <AttrControl
                    def={def}
                    value={filters.attrs[def.key] ?? {}}
                    options={facets[def.key] ?? []}
                    labelFor={(v) =>
                      def.type === 'lookup' && def.lookupList ? lookupLabels[def.lookupList]?.[v] ?? v : v
                    }
                    onChange={(patch) =>
                      setFilters((f) => ({ ...f, attrs: { ...f.attrs, [def.key]: { ...f.attrs[def.key], ...patch } } }))
                    }
                  />
                </Field>
              ))}
            </div>
          )}
        </FilterGroup>

        <FilterGroup
          icon={DollarSign}
          title="Fiyat & maliyet"
          count={(filters.priceMin != null || filters.priceMax != null ? 1 : 0) + (filters.purchaseMin != null || filters.purchaseMax != null ? 1 : 0)}
          defaultOpen
        >
          <Field label="Satış fiyatı">
            <Range min={filters.priceMin} max={filters.priceMax} onMin={(v) => setFilters((f) => ({ ...f, priceMin: v }))} onMax={(v) => setFilters((f) => ({ ...f, priceMax: v }))} />
          </Field>
          <Field label="Alış fiyatı">
            <Range min={filters.purchaseMin} max={filters.purchaseMax} onMin={(v) => setFilters((f) => ({ ...f, purchaseMin: v }))} onMax={(v) => setFilters((f) => ({ ...f, purchaseMax: v }))} />
          </Field>
        </FilterGroup>

        <FilterGroup icon={Warehouse} title="Stok durumu" count={filters.stockStatus ? 1 : 0}>
          <Chips
            options={[['Hepsi', undefined], ['Stokta', 'in'], ['Tükendi', 'out'], ['Az kaldı', 'low']] as Array<[string, StockStatus | undefined]>}
            selected={filters.stockStatus}
            onSelect={(v) => setFilters((f) => ({ ...f, stockStatus: v }))}
          />
        </FilterGroup>

        <FilterGroup
          icon={Boxes}
          title="Ürün bilgisi"
          count={
            (filters.types?.length ? 1 : 0) +
            (filters.brands?.length ? 1 : 0) +
            (filters.units?.length ? 1 : 0) +
            (filters.currencies?.length ? 1 : 0) +
            (filters.hasVariants != null ? 1 : 0) +
            (filters.weightMin != null || filters.weightMax != null ? 1 : 0)
          }
        >
          <Field label="Tür">
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_TYPES.map((ty) => {
                const on = (filters.types ?? []).includes(ty)
                return (
                  <Button
                    key={ty}
                    type="button"
                    variant={on ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilters((f) => ({ ...f, types: toggleT(f.types, ty) }))}
                  >
                    {PRODUCT_TYPE_LABELS[ty as ProductType]}
                  </Button>
                )
              })}
            </div>
          </Field>

          <Field label="Varyant">
            <Chips
              options={[['Hepsi', undefined], ['Varyantlı', true], ['Tekil', false]] as Array<[string, boolean | undefined]>}
              selected={filters.hasVariants}
              onSelect={(v) => setFilters((f) => ({ ...f, hasVariants: v }))}
            />
          </Field>

          {productFacets.brands.length > 0 ? (
            <Field label="Marka">
              <CheckList options={productFacets.brands.map((b) => ({ value: b, label: b }))} selected={filters.brands ?? []} onToggle={(v) => setFilters((f) => ({ ...f, brands: toggle(f.brands, v) }))} />
            </Field>
          ) : null}

          {productFacets.units.length > 0 ? (
            <Field label="Birim">
              <CheckList options={productFacets.units.map((u) => ({ value: u, label: unitLabels[u] ?? u }))} selected={filters.units ?? []} onToggle={(v) => setFilters((f) => ({ ...f, units: toggle(f.units, v) }))} />
            </Field>
          ) : null}

          {productFacets.currencies.length > 1 ? (
            <Field label="Para birimi">
              <CheckList options={productFacets.currencies.map((c) => ({ value: c, label: c }))} selected={filters.currencies ?? []} onToggle={(v) => setFilters((f) => ({ ...f, currencies: toggle(f.currencies, v) }))} />
            </Field>
          ) : null}

          <Field label="Ağırlık (kg)">
            <Range min={filters.weightMin} max={filters.weightMax} onMin={(v) => setFilters((f) => ({ ...f, weightMin: v }))} onMax={(v) => setFilters((f) => ({ ...f, weightMax: v }))} />
          </Field>
        </FilterGroup>

        <FilterGroup icon={ScanBarcode} title="Barkod" count={filters.barcode?.trim() ? 1 : 0}>
          <Input
            placeholder="Barkod (alt barkodlar dahil)"
            value={filters.barcode ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, barcode: e.target.value || undefined }))}
            className="h-8 font-mono"
          />
        </FilterGroup>

        {channels.length > 0 ? (
          <FilterGroup icon={Store} title="Satış kanalı" count={filters.channelIds?.length ?? 0}>
            <CheckList options={channels.map((c) => ({ value: c.id, label: c.name }))} selected={filters.channelIds ?? []} onToggle={(v) => setFilters((f) => ({ ...f, channelIds: toggle(f.channelIds, v) }))} />
          </FilterGroup>
        ) : null}

        <FilterGroup icon={ToggleLeft} title="Durum" count={filters.activeOnly ? 1 : 0}>
          <label className="flex items-center justify-between gap-2 text-sm">
            Sadece aktif ürünler
            <Switch checked={filters.activeOnly} onCheckedChange={(v) => setFilters((f) => ({ ...f, activeOnly: v }))} />
          </label>
        </FilterGroup>
      </div>
    </div>
  )
}

function attrActive(f?: AttrFilter): boolean {
  return Boolean(f && (f.text || f.min != null || f.max != null || f.bool != null || (f.values && f.values.length)))
}

function toggle(arr: string[] | undefined, v: string): string[] {
  const cur = arr ?? []
  return cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
}

function toggleT(arr: ProductType[] | undefined, v: ProductType): ProductType[] {
  const cur = arr ?? []
  return cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-2xs tracking-wide text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  )
}

function Range({
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
  return (
    <div className="flex items-center gap-2">
      <Input type="number" inputMode="decimal" placeholder="En az" value={min ?? ''} onChange={(e) => onMin(num(e.target.value))} className="h-8" />
      <span className="text-muted-foreground">–</span>
      <Input type="number" inputMode="decimal" placeholder="En çok" value={max ?? ''} onChange={(e) => onMax(num(e.target.value))} className="h-8" />
    </div>
  )
}

function Chips<T extends string | boolean | undefined>({
  options,
  selected,
  onSelect,
}: {
  options: Array<[string, T]>
  selected: T
  onSelect: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([label, v]) => (
        <Button key={label} type="button" variant={selected === v ? 'default' : 'outline'} size="sm" onClick={() => onSelect(v)}>
          {label}
        </Button>
      ))}
    </div>
  )
}

function CheckList({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ value: string; label: string }>
  selected: string[]
  onToggle: (value: string) => void
}) {
  if (options.length === 0) return <p className="text-xs text-muted-foreground">Seçenek yok.</p>
  return (
    <div className="max-h-48 space-y-0.5 overflow-y-auto">
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent">
          <Checkbox checked={selected.includes(o.value)} onCheckedChange={() => onToggle(o.value)} />
          <span className="truncate">{o.label}</span>
        </label>
      ))}
    </div>
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
  switch (def.type) {
    case 'number':
    case 'money':
      return (
        <div className="flex items-center gap-2">
          <Input type="number" inputMode="decimal" placeholder="En az" value={value.min ?? ''} onChange={(e) => onChange({ min: num(e.target.value) })} className="h-8" />
          <span className="text-muted-foreground">–</span>
          <Input type="number" inputMode="decimal" placeholder="En çok" value={value.max ?? ''} onChange={(e) => onChange({ max: num(e.target.value) })} className="h-8" />
          {def.unit ? <span className="text-xs text-muted-foreground">{def.unit}</span> : null}
        </div>
      )
    case 'boolean':
      return (
        <Chips
          options={[['Hepsi', undefined], ['Evet', true], ['Hayır', false]] as Array<[string, boolean | undefined]>}
          selected={value.bool}
          onSelect={(v) => onChange({ bool: v })}
        />
      )
    case 'select':
    case 'lookup':
    case 'multiselect': {
      const sel = value.values ?? []
      return (
        <CheckList
          options={options.map((o) => ({ value: o, label: labelFor(o) }))}
          selected={sel}
          onToggle={(v) => onChange({ values: sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v] })}
        />
      )
    }
    default:
      return <Input placeholder="İçeren…" value={value.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} className="h-8" />
  }
}
