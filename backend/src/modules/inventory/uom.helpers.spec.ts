import {
  convertUom,
  isConvertible,
  roundToStep,
  UomConversionError,
  type UomLike,
} from '@turbohesap/shared'

const WEIGHT = 'w'
const VOLUME = 'v'
const UOMS: UomLike[] = [
  { code: 'KG', categoryId: WEIGHT, factorToReference: 1, rounding: 0.0001 },
  { code: 'GR', categoryId: WEIGHT, factorToReference: 0.001, rounding: 0.0001 },
  { code: 'TON', categoryId: WEIGHT, factorToReference: 1000, rounding: 0.0001 },
  { code: 'LT', categoryId: VOLUME, factorToReference: 1, rounding: 0.0001 },
  { code: 'ADET', categoryId: 'c', factorToReference: 1, rounding: 1 },
]

describe('UoM conversion', () => {
  it('same code returns unchanged', () => {
    expect(convertUom(5, 'KG', 'KG', UOMS)).toBe(5)
  })
  it('converts within a category both ways', () => {
    expect(convertUom(1, 'KG', 'GR', UOMS)).toBe(1000)
    expect(convertUom(2500, 'GR', 'KG', UOMS)).toBe(2.5)
    expect(convertUom(1.5, 'TON', 'KG', UOMS)).toBe(1500)
  })
  it('applies the target rounding (whole units for ADET)', () => {
    expect(convertUom(1.5, 'ADET', 'ADET', UOMS)).toBe(1.5) // same code skips rounding
    expect(roundToStep(1.500003, 1)).toBe(2)
    expect(roundToStep(1.500003, 0.0001)).toBeCloseTo(1.5, 4)
  })
  it('throws across categories', () => {
    expect(() => convertUom(1, 'KG', 'LT', UOMS)).toThrow(UomConversionError)
  })
  it('throws on unknown code', () => {
    expect(() => convertUom(1, 'KG', 'XYZ', UOMS)).toThrow(UomConversionError)
  })
  it('isConvertible reflects category membership', () => {
    expect(isConvertible('KG', 'GR', UOMS)).toBe(true)
    expect(isConvertible('KG', 'LT', UOMS)).toBe(false)
    expect(isConvertible('KG', 'KG', UOMS)).toBe(true)
  })
})
