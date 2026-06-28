// Pure POS pricing math — shared by web + mobile so the register and the server
// agree to the kuruş. No platform/IO code.

import type { ProductDto } from '../inventory/product.dto'
import type { ProductVariantDto } from '../inventory/product-variant.dto'

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Base unit price for a product/variant on a register's sales channel.
 * Channel price (if the register has a channel and a price exists) wins; else
 * the variant's effective price; else the product's base salePrice.
 */
export function resolveUnitPrice(
  product: ProductDto,
  variant: ProductVariantDto | null,
  channelId: string | null,
): number {
  if (channelId) {
    const cp = (product.channelPrices ?? []).find(
      (p) => p.channelId === channelId && p.variantId === (variant?.id ?? null) && p.isActive,
    )
    if (cp) return cp.salePrice
  }
  if (variant) return variant.effectiveSalePrice ?? product.salePrice ?? 0
  return product.salePrice ?? 0
}

/** Per-line gross (qty × (unit + Σ modifier deltas), minus a % discount). */
export function lineGross(
  unitPrice: number,
  qty: number,
  discountRate: number,
  modifierDelta: number,
): number {
  const unit = unitPrice + modifierDelta
  const gross = unit * qty
  const discounted = gross * (1 - (discountRate || 0) / 100)
  return round2(discounted)
}

/**
 * Split a gross amount into net + tax. When `taxInclusive`, the gross already
 * contains the tax (TR shelf prices); otherwise tax is added on top.
 */
export function taxBreakdown(
  gross: number,
  taxRate: number,
  taxInclusive: boolean,
): { net: number; tax: number; total: number } {
  const rate = (taxRate || 0) / 100
  if (taxInclusive) {
    const net = round2(gross / (1 + rate))
    return { net, tax: round2(gross - net), total: round2(gross) }
  }
  const tax = round2(gross * rate)
  return { net: round2(gross), tax, total: round2(gross + tax) }
}

/** Σ of an order line's modifier price deltas. */
export function modifierDeltaSum(deltas: number[]): number {
  return round2(deltas.reduce((s, d) => s + (d || 0), 0))
}
