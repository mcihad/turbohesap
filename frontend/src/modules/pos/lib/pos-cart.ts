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
  type ProductBundleComponentDto,
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

/** Read-only preview of a bundle component shown indented under its parent line.
 *  The server authoritatively re-expands these on create/update, so they are NOT
 *  sent back as order lines — they exist only to mirror what the receipt will be. */
export interface CartBundleChild {
  name: string
  qty: number
  unitPrice: number
  isFree: boolean
}

export interface CartLine {
  /** Stable client id. Identical adds MERGE (qty increments); split-by-unit
   *  happens only at tender time. */
  key: string
  productId: string
  variantId: string | null
  name: string
  unitPrice: number
  taxRate: number
  qty: number
  discount: number
  modifiers: CartModifier[]
  /** Bundle component preview lines (read-only). */
  bundleChildren: CartBundleChild[]
}

let seq = 0
function nextKey(): string {
  seq += 1
  return `l${seq}-${Date.now().toString(36)}`
}

/** Map bundle component DTOs to read-only preview children. */
export function previewBundleChildren(
  components: ProductBundleComponentDto[] | undefined,
): CartBundleChild[] {
  return (components ?? []).map((c) => ({
    name: c.componentName,
    qty: c.qty,
    unitPrice: c.isFree ? 0 : c.unitPrice ?? 0,
    isFree: c.isFree,
  }))
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
  bundle?: ProductBundleComponentDto[],
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
    bundleChildren: previewBundleChildren(bundle),
  }
}

/** Stable signature used to MERGE identical lines: same product/variant, same
 *  modifier selection, same discount. */
function lineSignature(line: CartLine): string {
  const mods = line.modifiers
    .map((m) => `${m.groupId}:${m.optionId}`)
    .sort()
    .join('|')
  return `${line.productId}::${line.variantId ?? ''}::${line.discount}::${mods}`
}

/** Add a line, MERGING into an existing identical line (same product/variant +
 *  modifiers + discount) by incrementing its quantity. Per-unit splitting for
 *  separate payments happens only in the tender dialog. */
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const sig = lineSignature(line)
  const idx = lines.findIndex((l) => lineSignature(l) === sig)
  if (idx >= 0) {
    const next = [...lines]
    next[idx] = { ...next[idx], qty: next[idx].qty + line.qty }
    return next
  }
  return [...lines, line]
}

/** Σ value of a line's non-free bundle children (preview), tax-aware. */
function bundleChildrenTotal(line: CartLine, taxInclusive: boolean): number {
  let sum = 0
  for (const c of line.bundleChildren) {
    if (c.isFree || c.unitPrice <= 0) continue
    const gross = lineGross(c.unitPrice, c.qty * line.qty, 0, 0)
    sum += taxBreakdown(gross, line.taxRate, taxInclusive).total
  }
  return sum
}

export function lineTotal(line: CartLine, taxInclusive: boolean): number {
  const delta = modifierDeltaSum(line.modifiers.map((m) => m.priceDelta))
  const gross = lineGross(line.unitPrice, line.qty, line.discount, delta)
  return taxBreakdown(gross, line.taxRate, taxInclusive).total + bundleChildrenTotal(line, taxInclusive)
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
    grand += b.total + bundleChildrenTotal(l, taxInclusive)
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

/** Load an existing open order's lines into the cart (reopen a table's tab).
 *  Server-generated bundle children (isBundleChild) are NOT loaded as editable
 *  lines — they are folded back into their parent as read-only preview children
 *  (the server re-expands them on the next update). */
export function fromOrderLines(lines: PosOrderLineDto[]): CartLine[] {
  const childrenByParent = new Map<string, CartBundleChild[]>()
  for (const l of lines) {
    if (!l.isBundleChild || !l.bundleParentLineId) continue
    const list = childrenByParent.get(l.bundleParentLineId) ?? []
    list.push({ name: l.name, qty: l.qty, unitPrice: l.unitPrice, isFree: l.unitPrice <= 0 })
    childrenByParent.set(l.bundleParentLineId, list)
  }
  return lines
    .filter((l) => !l.isBundleChild)
    .map((l) => ({
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
      bundleChildren: childrenByParent.get(l.id) ?? [],
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
