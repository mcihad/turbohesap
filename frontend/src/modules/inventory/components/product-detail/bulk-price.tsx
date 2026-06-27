import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { SalesPermissions, toApiError, type ProductDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { money } from '../../labels'

// A price string is valid when empty (= "leave unchanged" / "inherit") or a
// finite, non-negative number. Strict: rejects NaN, Infinity and negatives.
function isInvalid(v: string): boolean {
  const s = v.trim()
  if (s === '') return false
  const n = Number(s)
  return !Number.isFinite(n) || n < 0
}

function norm(v: string): string {
  return v.trim()
}

export interface MatrixRow {
  id: string
  label: string
  sublabel?: string
  /** Initial value (string) — what's currently stored. */
  initial: string
  /** Placeholder shown when empty (e.g. the inherited/effective price). */
  hint?: string
}

// Presentational matrix: a "fill all" box on top + one right-aligned price input
// per row. Invalid cells get a destructive border. Holds no derived state, so it
// can't drive an update loop.
function PriceMatrix({
  rows,
  values,
  currency,
  onChange,
  onFillAll,
}: {
  rows: MatrixRow[]
  values: Record<string, string>
  currency: string
  onChange: (id: string, v: string) => void
  onFillAll: (v: string) => void
}) {
  const [fill, setFill] = React.useState('')
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 rounded-lg border bg-muted/30 p-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Tümüne uygula ({currency})</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={fill}
            onChange={(e) => setFill(e.target.value)}
            placeholder="örn. 100"
            className={isInvalid(fill) ? 'border-destructive' : ''}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onFillAll(norm(fill))}
          disabled={fill.trim() === '' || isInvalid(fill)}
        >
          Uygula
        </Button>
      </div>

      <div className="max-h-[45vh] divide-y overflow-y-auto rounded-lg border">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.label}</p>
              {r.sublabel ? <p className="truncate text-xs text-muted-foreground">{r.sublabel}</p> : null}
            </div>
            <Input
              type="number"
              inputMode="decimal"
              value={values[r.id] ?? ''}
              onChange={(e) => onChange(r.id, e.target.value)}
              placeholder={r.hint}
              className={`w-28 text-right tabular-nums ${isInvalid(values[r.id] ?? '') ? 'border-destructive' : ''}`}
            />
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Varyant yok.</p>
        ) : null}
      </div>
    </div>
  )
}

// --- Bulk channel prices -------------------------------------------------
// Edit every variant's price on one channel at once. Only changed cells are
// written: a new value upserts the channel price, an emptied cell removes the
// existing one, untouched cells are left as-is.
//
// State is reset only on an explicit channel change (or a one-time default
// init) — never synced from a derived object via an effect, which would loop.
export function BulkChannelPriceDialog({
  product,
  onClose,
  onSaved,
}: {
  product: ProductDto
  onClose: () => void
  onSaved: () => void
}) {
  const { hasPermission } = useAuth()
  const channelsQuery = useQuery({
    queryKey: ['sales', 'channels'],
    queryFn: () => api.sales.channels.list(),
    enabled: hasPermission(SalesPermissions.channelsRead),
  })
  const channels = channelsQuery.data ?? []
  const variants = React.useMemo(
    () => (product.variants ?? []).filter((v) => v.isActive),
    [product.variants],
  )

  // The stored price for (channel, variant), as a string ('' = none).
  const stored = React.useCallback(
    (channelId: string, variantId: string): string => {
      const row = (product.channelPrices ?? []).find(
        (c) => c.channelId === channelId && c.variantId === variantId,
      )
      return row ? String(row.salePrice) : ''
    },
    [product.channelPrices],
  )
  const buildValues = React.useCallback(
    (channelId: string): Record<string, string> =>
      Object.fromEntries(variants.map((v) => [v.id, stored(channelId, v.id)])),
    [variants, stored],
  )

  const [channelId, setChannelId] = React.useState('')
  const [values, setValues] = React.useState<Record<string, string>>({})

  // One-time default: pick the first channel and load its prices. Ref-guarded so
  // it runs exactly once (channels settling can't re-trigger it).
  const didInit = React.useRef(false)
  React.useEffect(() => {
    if (didInit.current || channels.length === 0) return
    didInit.current = true
    const cid = channels[0].id
    setChannelId(cid)
    setValues(buildValues(cid))
  }, [channels, buildValues])

  const selectChannel = (cid: string) => {
    setChannelId(cid)
    setValues(buildValues(cid))
  }

  const rows: MatrixRow[] = variants.map((v) => ({
    id: v.id,
    label: v.label || v.code,
    sublabel: v.code,
    initial: stored(channelId, v.id),
    hint: v.effectiveSalePrice == null ? undefined : String(v.effectiveSalePrice),
  }))
  const anyInvalid = rows.some((r) => isInvalid(values[r.id] ?? ''))
  const changes = rows.filter((r) => norm(values[r.id] ?? '') !== norm(r.initial))

  const save = useMutation({
    mutationFn: async () => {
      if (!channelId) throw new Error('Önce bir kanal seçin')
      if (anyInvalid) throw new Error('Geçersiz fiyat var (negatif/sayı değil)')
      for (const r of changes) {
        const cur = norm(values[r.id] ?? '')
        if (cur === '') {
          const existing = (product.channelPrices ?? []).find(
            (c) => c.channelId === channelId && c.variantId === r.id,
          )
          if (existing) await api.inventory.products.removeChannelPrice(product.id, existing.id)
        } else {
          await api.inventory.products.setChannelPrice(product.id, {
            variantId: r.id,
            channelId,
            salePrice: Number(cur),
          })
        }
      }
    },
    onSuccess: () => {
      toast.success(`${changes.length} fiyat güncellendi`)
      onSaved()
    },
    onError: (e) => toast.error('Kaydetme başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kanala göre toplu fiyat</DialogTitle>
          <DialogDescription>
            Seçilen kanalda her varyantın fiyatını düzenleyin. Yalnızca değiştirdiğiniz
            satırlar kaydedilir; boş bırakılanlar mevcut kanal fiyatını kaldırır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Kanal</Label>
            <Select value={channelId || undefined} onValueChange={selectChannel}>
              <SelectTrigger><SelectValue placeholder="Kanal seçin" /></SelectTrigger>
              <SelectContent>
                {channels.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Taban satış: <span className="font-medium text-foreground">{money(product.salePrice, product.currency)}</span>.
            Boş kutu = varyantın kendi fiyatı geçerli.
          </p>

          <PriceMatrix
            rows={rows}
            values={values}
            currency={product.currency}
            onChange={(id, v) => setValues((s) => ({ ...s, [id]: v }))}
            onFillAll={(v) => setValues(Object.fromEntries(rows.map((r) => [r.id, v])))}
          />
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {anyInvalid ? <span className="text-destructive">Geçersiz fiyat var</span> : `${changes.length} değişiklik`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>İptal</Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || anyInvalid || changes.length === 0 || !channelId}
            >
              Kaydet
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Bulk variant base prices --------------------------------------------
// Edit every variant's own sale price (the override) at once. An emptied cell
// reverts that variant to inheriting the template price (+ priceExtra). Values
// are initialised once (the dialog remounts each open) — no syncing effect.
export function BulkVariantPriceDialog({
  product,
  onClose,
  onSaved,
}: {
  product: ProductDto
  onClose: () => void
  onSaved: () => void
}) {
  const variants = React.useMemo(
    () => (product.variants ?? []).filter((v) => v.isActive),
    [product.variants],
  )
  const baseline = React.useCallback(
    (variantId: string): string => {
      const v = variants.find((x) => x.id === variantId)
      return v && v.salePrice != null ? String(v.salePrice) : ''
    },
    [variants],
  )

  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(variants.map((v) => [v.id, v.salePrice == null ? '' : String(v.salePrice)])),
  )

  const rows: MatrixRow[] = variants.map((v) => ({
    id: v.id,
    label: v.label || v.code,
    sublabel: v.priceExtra ? `${v.code} · +${money(v.priceExtra, product.currency)}` : v.code,
    initial: baseline(v.id),
    hint: v.effectiveSalePrice == null ? undefined : String(v.effectiveSalePrice),
  }))
  const anyInvalid = rows.some((r) => isInvalid(values[r.id] ?? ''))
  const changes = rows.filter((r) => norm(values[r.id] ?? '') !== norm(r.initial))

  const save = useMutation({
    mutationFn: async () => {
      if (anyInvalid) throw new Error('Geçersiz fiyat var (negatif/sayı değil)')
      for (const r of changes) {
        const cur = norm(values[r.id] ?? '')
        await api.inventory.products.updateVariant(product.id, r.id, {
          salePrice: cur === '' ? null : Number(cur),
        })
      }
    },
    onSuccess: () => {
      toast.success(`${changes.length} varyant fiyatı güncellendi`)
      onSaved()
    },
    onError: (e) => toast.error('Kaydetme başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Varyant fiyatlarını topluca düzenle</DialogTitle>
          <DialogDescription>
            Her varyantın sabit satış fiyatını düzenleyin. Boş bırakılan satır taban
            fiyatı (+ fark) devralır. Yalnızca değiştirdiğiniz satırlar kaydedilir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-1">
          <p className="text-xs text-muted-foreground">
            Taban satış: <span className="font-medium text-foreground">{money(product.salePrice, product.currency)}</span>.
          </p>
          <PriceMatrix
            rows={rows}
            values={values}
            currency={product.currency}
            onChange={(id, v) => setValues((s) => ({ ...s, [id]: v }))}
            onFillAll={(v) => setValues(Object.fromEntries(rows.map((r) => [r.id, v])))}
          />
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {anyInvalid ? <span className="text-destructive">Geçersiz fiyat var</span> : `${changes.length} değişiklik`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>İptal</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || anyInvalid || changes.length === 0}>
              Kaydet
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
