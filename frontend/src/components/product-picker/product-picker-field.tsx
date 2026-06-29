import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'

import type { SellableUnitDto } from '@turbohesap/shared'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { EntityCombobox } from '@/modules/invoices/components/entity-combobox'
import { ProductPickerDialog } from './product-picker-dialog'

/**
 * A product autocomplete with a magnifier that opens the rich, floating
 * {@link ProductPickerDialog}. The typeahead resolves a single sellable unit;
 * the magnifier opens single- or multi-select depending on `allowMulti`.
 *
 * The lightweight typeahead list and the dialog both load lazily — nothing is
 * fetched until the user focuses the field or opens the dialog.
 */
export function ProductPickerField({
  value,
  onChange,
  allowMulti,
  onPickMulti,
  placeholder = 'Ürün seç…',
  disabled,
  className,
  title = 'Ürün seç',
  onCreate,
  createLabel,
}: {
  /** Currently selected unit id OR productId (matched against either). */
  value: string | null
  onChange: (unit: SellableUnitDto | null) => void
  allowMulti?: boolean
  onPickMulti?: (units: SellableUnitDto[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  title?: string
  /** Optional inline "create product" action surfaced in the typeahead. */
  onCreate?: (query: string) => void
  createLabel?: string
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  // Lazy: only fetch the typeahead list once the user interacts with the field.
  const [activated, setActivated] = React.useState(false)

  const sellableQuery = useQuery({
    queryKey: ['inventory', 'products', 'sellable'],
    queryFn: () => api.inventory.products.sellable(),
    enabled: activated || dialogOpen,
  })
  const units = sellableQuery.data ?? []

  // Match on the row id first, then fall back to productId (callers usually
  // store a productId, e.g. invoice lines / bundle components).
  const selectedId = React.useMemo(() => {
    if (!value) return null
    const byId = units.find((u) => u.id === value)
    if (byId) return byId.id
    const byProduct = units.find((u) => u.productId === value)
    return byProduct ? byProduct.id : value
  }, [units, value])

  const mode: 'single' | 'multi' = allowMulti ? 'multi' : 'single'

  return (
    <div className={className} onFocusCapture={() => setActivated(true)} onPointerEnter={() => setActivated(true)}>
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <EntityCombobox
            items={units}
            value={selectedId}
            onChange={(_id, item) => onChange(item)}
            getId={(u) => u.id}
            getLabel={(u) => u.label}
            getSub={(u) => u.code}
            placeholder={placeholder}
            searchPlaceholder="Ürün ara (ad / kod / barkod)…"
            emptyText="Ürün bulunamadı"
            disabled={disabled}
            onCreate={onCreate}
            createLabel={createLabel}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          disabled={disabled}
          onClick={() => setDialogOpen(true)}
          aria-label="Ürün ara"
          title="Gelişmiş ürün arama"
        >
          <Search className="size-4" />
        </Button>
      </div>

      <ProductPickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        title={title}
        onConfirm={(picked) => {
          if (allowMulti && onPickMulti) onPickMulti(picked)
          else onChange(picked[0] ?? null)
        }}
      />
    </div>
  )
}
