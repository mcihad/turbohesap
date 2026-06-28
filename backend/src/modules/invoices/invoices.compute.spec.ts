import { computeInvoiceTotals, computeLine, round2 } from '@turbohesap/shared'

describe('invoice computation (KDV + tevkifat)', () => {
  it('computes a line: gross − discount → net, KDV, total', () => {
    const c = computeLine({ quantity: 10, unitPrice: 100, discountRate: 10, vatRate: 20 })
    // gross 1000, discount 100, net 900, vat 180, total 1080
    expect(c.lineNet).toBe(900)
    expect(c.lineVat).toBe(180)
    expect(c.lineTotal).toBe(1080)
    expect(c.lineWithholding).toBe(0)
  })

  it('applies tevkifat (9/10) to the line VAT', () => {
    const c = computeLine({ quantity: 1, unitPrice: 1000, vatRate: 20, withholdingCode: '9/10' })
    // net 1000, vat 200, withheld 180
    expect(c.lineVat).toBe(200)
    expect(c.lineWithholding).toBe(180)
  })

  it('builds invoice totals + KDV özeti grouped by rate', () => {
    const t = computeInvoiceTotals([
      { quantity: 2, unitPrice: 100, vatRate: 20 }, // net 200, vat 40
      { quantity: 1, unitPrice: 100, vatRate: 10 }, // net 100, vat 10
      { quantity: 5, unitPrice: 50, vatRate: 20 }, // net 250, vat 50
    ])
    expect(t.subtotal).toBe(550)
    expect(t.vatBase).toBe(550)
    expect(t.vatTotal).toBe(100)
    expect(t.withholdingTotal).toBe(0)
    expect(t.grandTotal).toBe(650)
    expect(t.vatSummary).toEqual([
      { rate: 10, base: 100, vat: 10 },
      { rate: 20, base: 450, vat: 90 },
    ])
  })

  it('grand total subtracts withheld KDV (tevkifat)', () => {
    const t = computeInvoiceTotals([
      { quantity: 1, unitPrice: 1000, vatRate: 20, withholdingCode: '5/10' }, // vat 200, withheld 100
    ])
    expect(t.vatBase).toBe(1000)
    expect(t.vatTotal).toBe(200)
    expect(t.withholdingTotal).toBe(100)
    // 1000 + 200 − 100 = 1100
    expect(t.grandTotal).toBe(1100)
  })

  it('round2 is half-up to 2 decimals', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(2.344)).toBe(2.34)
  })
})
