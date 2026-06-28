// Pure invoice math — the SINGLE source of truth for line and invoice totals,
// the KDV özeti (VAT summary by rate) and KDV tevkifatı (withholding). Used by the
// backend (authoritative, on save/issue) AND the web/mobile entry forms (live
// preview). Framework-agnostic, no I/O — operates on plain numbers (agy.md §4).

import { WITHHOLDING_RATIOS, type InvoiceVatSummaryRow } from './invoice.dto'

/** Round to 2 decimals, half-up (money). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Withheld fraction for a tevkifat code ('9/10' → 0.9); 0 when none/unknown. */
export function withholdingFraction(code: string | null | undefined): number {
  if (!code) return 0
  return WITHHOLDING_RATIOS.find((w) => w.code === code)?.value ?? 0
}

export interface LineInput {
  quantity: number
  unitPrice: number
  discountRate?: number
  vatRate: number
  withholdingCode?: string | null
}

export interface ComputedLine {
  lineGross: number
  lineDiscount: number
  lineNet: number // matrah
  lineVat: number
  lineWithholding: number
  lineTotal: number // net + vat
}

export function computeLine(line: LineInput): ComputedLine {
  const gross = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)
  const discount = gross * ((Number(line.discountRate) || 0) / 100)
  const net = round2(gross - discount)
  const vat = round2(net * ((Number(line.vatRate) || 0) / 100))
  const withholding = round2(vat * withholdingFraction(line.withholdingCode))
  return {
    lineGross: round2(gross),
    lineDiscount: round2(discount),
    lineNet: net,
    lineVat: vat,
    lineWithholding: withholding,
    lineTotal: round2(net + vat),
  }
}

export interface InvoiceTotals {
  subtotal: number // Σ gross (mal/hizmet toplamı)
  discountTotal: number
  vatBase: number // KDV matrahı (Σ net)
  vatTotal: number // KDV toplamı
  withholdingTotal: number // tevkifat edilen KDV
  grandTotal: number // ödenecek = vatBase + vatTotal − withholding
  vatSummary: InvoiceVatSummaryRow[] // KDV özeti, rate'e göre
}

export function computeInvoiceTotals(lines: LineInput[]): InvoiceTotals {
  let subtotal = 0
  let discountTotal = 0
  let vatBase = 0
  let vatTotal = 0
  let withholdingTotal = 0
  const byRate = new Map<number, { base: number; vat: number }>()

  for (const line of lines) {
    const c = computeLine(line)
    subtotal += c.lineGross
    discountTotal += c.lineDiscount
    vatBase += c.lineNet
    vatTotal += c.lineVat
    withholdingTotal += c.lineWithholding
    const rate = Number(line.vatRate) || 0
    const row = byRate.get(rate) ?? { base: 0, vat: 0 }
    row.base += c.lineNet
    row.vat += c.lineVat
    byRate.set(rate, row)
  }

  const vatSummary = [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, v]) => ({ rate, base: round2(v.base), vat: round2(v.vat) }))

  subtotal = round2(subtotal)
  discountTotal = round2(discountTotal)
  vatBase = round2(vatBase)
  vatTotal = round2(vatTotal)
  withholdingTotal = round2(withholdingTotal)
  const grandTotal = round2(vatBase + vatTotal - withholdingTotal)

  return { subtotal, discountTotal, vatBase, vatTotal, withholdingTotal, grandTotal, vatSummary }
}
