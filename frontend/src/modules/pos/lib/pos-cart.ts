// Client-side cart model + pricing preview for the POS sell screen. The server
// is the source of truth (it re-resolves prices on create), but the cashier
// needs an instant, accurate preview that agrees with the server to the kuruş —
// so we reuse the SAME shared pricing helpers the backend uses.

import {
  lineGross,
  modifierDeltaSum,
  resolveUnitPrice,
  taxBreakdown,
  type CreatePosOrderLineInput,
  type PosOrderLineDto,
  type ProductDto,
  type ProductModifierGroupDto,
  type ProductModifierOptionDto,
} from '@turbohesap/shared'

export interface CartModifier {
  groupId: string
  optionId: string
  groupName: string
  optionName: string
  priceDelta: number
}

export interface CartLine {
  /** Stable client id (also used to de-dupe identical product+modifier lines). */
  key: string
  productId: string
  variantId: string | null
  name: string
  unitPrice: number
  taxRate: number
  qty: number
  discount: number
  modifiers: CartModifier[]
}

let seq = 0
function nextKey(): string {
  seq += 1
  return `l${seq}-${Date.now().toString(36)}`
}

/** A signature that makes two adds of the same product+modifiers merge into one line. */
function signature(productId: string, variantId: string | null, mods: CartModifier[]): string {
  const m = [...mods].map((x) => x.optionId).sort().join(',')
  return `${productId}|${variantId ?? ''}|${m}`
}

export function buildModifiers(
  groups: ProductModifierGroupDto[],
  selected: Record<string, string[]>,
): CartModifier[] {
  const out: CartModifier[] = []
  for (const g of groups) {
    for (const optId of selected[g.id] ?? []) {
      const opt = g.options.find((o) => o.id === optId)
      if (opt) {
        out.push({
          groupId: g.id,
          optionId: opt.id,
          groupName: g.name,
          optionName: opt.name,
          priceDelta: opt.priceDelta,
        })
      }
    }
  }
  return out
}

export function makeLine(
  product: ProductDto,
  channelId: string | null,
  modifiers: CartModifier[],
  qty = 1,
): CartLine {
  return {
    key: nextKey(),
    productId: product.id,
    variantId: null,
    name: product.name,
    unitPrice: resolveUnitPrice(product, null, channelId),
    taxRate: product.taxRate ?? 0,
    qty,
    discount: 0,
    modifiers,
  }
}

/** Add a line, merging with an identical existing line (same product+modifiers). */
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const sig = signature(line.productId, line.variantId, line.modifiers)
  const idx = lines.findIndex(
    (l) => signature(l.productId, l.variantId, l.modifiers) === sig && l.discount === line.discount,
  )
  if (idx >= 0) {
    const next = [...lines]
    next[idx] = { ...next[idx], qty: next[idx].qty + line.qty }
    return next
  }
  return [...lines, line]
}

export function lineTotal(line: CartLine, taxInclusive: boolean): number {
  const delta = modifierDeltaSum(line.modifiers.map((m) => m.priceDelta))
  const gross = lineGross(line.unitPrice, line.qty, line.discount, delta)
  return taxBreakdown(gross, line.taxRate, taxInclusive).total
}

export interface CartTotals {
  subtotal: number
  taxTotal: number
  grandTotal: number
  itemCount: number
}

export function cartTotals(lines: CartLine[], taxInclusive: boolean): CartTotals {
  let grand = 0
  let tax = 0
  let items = 0
  for (const l of lines) {
    const delta = modifierDeltaSum(l.modifiers.map((m) => m.priceDelta))
    const gross = lineGross(l.unitPrice, l.qty, l.discount, delta)
    const b = taxBreakdown(gross, l.taxRate, taxInclusive)
    grand += b.total
    tax += b.tax
    items += l.qty
  }
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
  return {
    grandTotal: round2(grand),
    taxTotal: round2(tax),
    subtotal: round2(grand - tax),
    itemCount: items,
  }
}

/** Convert the cart into the create-order payload (server re-resolves prices). */
export function toOrderLines(lines: CartLine[]): CreatePosOrderLineInput[] {
  return lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    qty: l.qty,
    discount: l.discount,
    modifiers: l.modifiers.map((m) => ({ groupId: m.groupId, optionId: m.optionId })),
  }))
}

/** Load an existing open order's lines into the cart (reopen a table's tab). */
export function fromOrderLines(lines: PosOrderLineDto[]): CartLine[] {
  return lines.map((l) => ({
    key: nextKey(),
    productId: l.productId ?? '',
    variantId: l.variantId,
    name: l.name,
    unitPrice: l.unitPrice,
    taxRate: l.taxRate,
    qty: l.qty,
    discount: l.discount,
    modifiers: l.modifiers.map((m) => ({
      groupId: m.groupId ?? '',
      optionId: m.optionId ?? '',
      groupName: m.groupNameSnapshot,
      optionName: m.optionNameSnapshot,
      priceDelta: m.priceDelta,
    })),
  }))
}

/** Default option pre-selection for a product's modifier groups. */
export function defaultSelections(
  groups: ProductModifierGroupDto[],
): Record<string, string[]> {
  const sel: Record<string, string[]> = {}
  for (const g of groups) {
    const defaults = g.options.filter((o: ProductModifierOptionDto) => o.isDefault).map((o) => o.id)
    if (defaults.length) sel[g.id] = g.selectionType === 'single' ? [defaults[0]] : defaults
  }
  return sel
}
