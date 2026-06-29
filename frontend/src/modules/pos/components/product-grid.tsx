import * as React from 'react'
import { Package } from 'lucide-react'

import {
  resolveUnitPrice,
  type CategoryDto,
  type ProductDto,
} from '@turbohesap/shared'
import { cn } from '@/lib/utils'
import { money } from '../labels'

// Touch-friendly product tiles. Shows products in the active category and all of
// its descendants (so a top-level category still shows everything beneath it),
// optionally narrowed by the search/barcode box.
export function ProductGrid({
  products,
  categories,
  activeCategoryId,
  search,
  channelId,
  onPick,
}: {
  products: ProductDto[]
  categories: CategoryDto[]
  activeCategoryId: string | null
  search: string
  channelId: string | null
  onPick: (product: ProductDto) => void
}) {
  // Set of category ids that count as "in" the active category (self + subtree).
  const subtree = React.useMemo(() => {
    if (!activeCategoryId) return null
    const childrenOf = new Map<string, string[]>()
    for (const c of categories) {
      const p = c.parentId ?? ''
      if (!childrenOf.has(p)) childrenOf.set(p, [])
      childrenOf.get(p)!.push(c.id)
    }
    const ids = new Set<string>()
    const stack = [activeCategoryId]
    while (stack.length) {
      const id = stack.pop()!
      ids.add(id)
      for (const child of childrenOf.get(id) ?? []) stack.push(child)
    }
    return ids
  }, [activeCategoryId, categories])

  const q = search.trim().toLocaleLowerCase('tr')
  const filtered = React.useMemo(
    () =>
      products.filter((p) => {
        if (p.type === 'service') {
          // services are sellable too; keep them
        }
        if (subtree && !(p.categoryId && subtree.has(p.categoryId))) return false
        if (q) {
          const hay = `${p.name} ${p.code} ${p.barcodes?.join(' ') ?? ''}`.toLocaleLowerCase('tr')
          if (!hay.includes(q)) return false
        }
        return true
      }),
    [products, subtree, q],
  )

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
        <Package className="size-10 opacity-40" />
        <p className="text-sm">Ürün bulunamadı</p>
        <p className="text-2xs">Aramayı değiştirin veya başka bir kategori seçin.</p>
      </div>
    )
  }

  return (
    <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] content-start gap-3.5 overflow-y-auto p-4">
      {filtered.map((p) => {
        const price = resolveUnitPrice(p, null, channelId)
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            className={cn(
              'flex h-52 flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-xs transition-all',
              'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg active:translate-y-0 active:scale-[0.97]',
            )}
          >
            <div className="relative aspect-square w-full overflow-hidden bg-muted/50">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground/40">
                  <Package className="size-11" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between gap-1.5 p-3">
              <span className="line-clamp-2 text-[0.95rem] font-medium leading-snug">{p.name}</span>
              <span className="inline-flex w-fit items-center rounded-lg bg-primary/10 px-2.5 py-1 text-base font-bold tabular-nums text-primary">
                {money(price, p.currency)}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
