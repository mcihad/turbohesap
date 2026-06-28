import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'

import { toApiError, type BranchDto, type ProductDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const NONE = 'none'
const cellKey = (variantId: string | null, branchId: string | null) =>
  `${variantId ?? NONE}|${branchId ?? NONE}`

/**
 * Şube × Varyant stok matrisi — her hücre düzenlenebilir mutlak miktar; tek
 * "Kaydet" değişen hücreleri toplu olarak `setStock` ile uygular.
 */
export function StockMatrix({
  product,
  branches,
  canStock,
  refetch,
}: {
  product: ProductDto
  branches: BranchDto[]
  canStock: boolean
  refetch: () => void
}) {
  const variants = product.variants ?? []

  const rows = React.useMemo(
    () =>
      variants.length > 0
        ? variants.map((v) => ({
            key: v.id,
            label: v.label || v.code,
            sub: v.code,
            variantId: v.id as string | null,
          }))
        : [{ key: NONE, label: 'Tüm ürün', sub: product.code, variantId: null as string | null }],
    [variants, product.code],
  )

  const cols = React.useMemo(
    () => [
      { key: NONE, branchId: null as string | null, name: 'Genel', code: '' },
      ...branches.map((b) => ({ key: b.id, branchId: b.id as string | null, name: b.name, code: b.code })),
    ],
    [branches],
  )

  // Original on-hand per cell (absolute), from the product's stock breakdown.
  const original = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of product.stock ?? []) map[cellKey(s.variantId, s.branchId)] = s.quantity
    return map
  }, [product.stock])

  const [values, setValues] = React.useState<Record<string, string>>({})

  // (Re)seed the editable grid whenever the product reloads.
  React.useEffect(() => {
    const init: Record<string, string> = {}
    for (const r of rows) for (const c of cols) {
      const k = cellKey(r.variantId, c.branchId)
      init[k] = String(original[k] ?? 0)
    }
    setValues(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.updatedAt, rows.length, cols.length])

  const isDirty = (k: string) => (values[k] ?? '') !== String(original[k] ?? 0)
  const dirtyKeys = Object.keys(values).filter(isDirty)
  const num = (k: string) => Number(values[k]) || 0

  const colTotal = (branchId: string | null) =>
    rows.reduce((s, r) => s + num(cellKey(r.variantId, branchId)), 0)
  const rowTotal = (variantId: string | null) =>
    cols.reduce((s, c) => s + num(cellKey(variantId, c.branchId)), 0)
  const grandTotal = rows.reduce((s, r) => s + rowTotal(r.variantId), 0)

  const save = useMutation({
    mutationFn: async () => {
      for (const k of dirtyKeys) {
        const [vid, bid] = k.split('|')
        await api.inventory.products.setStock(product.id, {
          variantId: vid === NONE ? null : vid,
          branchId: bid === NONE ? null : bid,
          quantity: Number(values[k]) || 0,
        })
      }
    },
    onSuccess: () => {
      toast.success(`${dirtyKeys.length} hücre güncellendi`)
      refetch()
    },
    onError: (e) => toast.error('Kaydetme başarısız', { description: toApiError(e).message }),
  })

  const reset = () => {
    const init: Record<string, string> = {}
    for (const r of rows) for (const c of cols) {
      const k = cellKey(r.variantId, c.branchId)
      init[k] = String(original[k] ?? 0)
    }
    setValues(init)
  }

  const unit = product.unit

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* başlık + kaydet çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Şube × Varyant Stok Matrisi</h3>
          <p className="text-xs text-muted-foreground">
            Hücreleri düzenleyin, değişenleri tek seferde kaydedin.
          </p>
        </div>
        {canStock ? (
          <div className="flex items-center gap-2">
            {dirtyKeys.length > 0 ? (
              <Badge variant="warning" className="tabular-nums">
                {dirtyKeys.length} değişiklik
              </Badge>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="size-3.5" /> Güncel
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={dirtyKeys.length === 0 || save.isPending}
            >
              <RotateCcw className="size-4" />
              Sıfırla
            </Button>
            <Button
              size="sm"
              onClick={() => save.mutate()}
              disabled={dirtyKeys.length === 0 || save.isPending}
            >
              <Save className="size-4" />
              Kaydet
            </Button>
          </div>
        ) : null}
      </div>

      {/* matris */}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 border-b bg-card px-4 py-2.5 text-left align-bottom">
                <span className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
                  Varyant \ Şube
                </span>
              </th>
              {cols.map((c) => (
                <th key={c.key} className="border-b bg-card px-3 py-2.5 text-center">
                  <div className="text-xs font-semibold whitespace-nowrap">{c.name}</div>
                  {c.code ? (
                    <div className="font-mono text-2xs text-muted-foreground">{c.code}</div>
                  ) : (
                    <div className="text-2xs text-muted-foreground">şubesiz</div>
                  )}
                </th>
              ))}
              <th className="border-b border-l bg-muted/30 px-3 py-2.5 text-center">
                <span className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
                  Toplam
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.key} className={cn(ri % 2 === 1 && 'bg-muted/20')}>
                <td className="sticky left-0 z-10 border-b bg-inherit px-4 py-2">
                  <div className="font-medium whitespace-nowrap">{r.label}</div>
                  {r.sub && r.sub !== r.label ? (
                    <div className="font-mono text-2xs text-muted-foreground">{r.sub}</div>
                  ) : null}
                </td>
                {cols.map((c) => {
                  const k = cellKey(r.variantId, c.branchId)
                  const dirty = isDirty(k)
                  return (
                    <td key={c.key} className="border-b px-2 py-1.5 text-center">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={values[k] ?? ''}
                        disabled={!canStock || save.isPending}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [k]: e.target.value }))
                        }
                        onFocus={(e) => e.currentTarget.select()}
                        className={cn(
                          'h-9 w-20 rounded-md border bg-background px-2 text-right tabular-nums outline-none transition-colors',
                          'focus:border-primary focus:ring-2 focus:ring-ring',
                          'disabled:cursor-default disabled:opacity-70',
                          dirty
                            ? 'border-warning bg-warning/10 font-semibold text-foreground'
                            : 'border-input',
                        )}
                      />
                    </td>
                  )
                })}
                <td className="border-b border-l bg-muted/20 px-3 py-2 text-right font-mono font-semibold tabular-nums">
                  {rowTotal(r.variantId)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40">
              <td className="sticky left-0 z-10 bg-muted/40 px-4 py-2.5 text-2xs font-medium tracking-wide text-muted-foreground uppercase">
                Şube toplamı
              </td>
              {cols.map((c) => (
                <td
                  key={c.key}
                  className="px-3 py-2.5 text-center font-mono font-semibold tabular-nums"
                >
                  {colTotal(c.branchId)}
                </td>
              ))}
              <td className="border-l bg-primary/10 px-3 py-2.5 text-right font-mono font-bold tabular-nums text-primary">
                {grandTotal}
                {unit ? <span className="ml-1 text-2xs font-normal text-muted-foreground">{unit}</span> : null}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
