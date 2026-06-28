import { lineGross, modifierDeltaSum, taxBreakdown } from '@turbohesap/shared'

describe('POS pricing helpers', () => {
  describe('modifierDeltaSum', () => {
    it('sums positive and negative deltas', () => {
      expect(modifierDeltaSum([10, -5, 2.5])).toBe(7.5)
    })
    it('treats missing values as zero', () => {
      expect(modifierDeltaSum([])).toBe(0)
    })
  })

  describe('lineGross', () => {
    it('adds modifier delta to the unit price before multiplying by qty', () => {
      // (199.9 + 10) * 2 = 419.8
      expect(lineGross(199.9, 2, 0, 10)).toBe(419.8)
    })
    it('applies a percentage discount', () => {
      // (100 + 0) * 2 * (1 - 10%) = 180
      expect(lineGross(100, 2, 10, 0)).toBe(180)
    })
    it('handles a negative modifier (e.g. soğan çıkar)', () => {
      // (50 - 5) * 1 = 45
      expect(lineGross(50, 1, 0, -5)).toBe(45)
    })
  })

  describe('taxBreakdown', () => {
    it('extracts tax from a KDV-inclusive gross (TR shelf price)', () => {
      // 110 inc. 10% → net 100, tax 10
      const r = taxBreakdown(110, 10, true)
      expect(r.net).toBe(100)
      expect(r.tax).toBe(10)
      expect(r.total).toBe(110)
    })
    it('adds tax on top when exclusive', () => {
      const r = taxBreakdown(100, 10, false)
      expect(r.net).toBe(100)
      expect(r.tax).toBe(10)
      expect(r.total).toBe(110)
    })
    it('is a no-op at 0% rate', () => {
      const r = taxBreakdown(100, 0, true)
      expect(r).toEqual({ net: 100, tax: 0, total: 100 })
    })
    it('net + tax always equals total (inclusive, odd amount)', () => {
      const r = taxBreakdown(419.8, 10, true)
      expect(r.net + r.tax).toBeCloseTo(r.total, 2)
      expect(r.total).toBe(419.8)
    })
  })
})
