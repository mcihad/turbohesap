// Pure UoM conversion — shared by web, mobile and the backend so a quantity
// converts identically everywhere. Conversion is only valid WITHIN one category.
import type { UomDto } from './uom.dto'

export type UomLike = Pick<UomDto, 'code' | 'categoryId' | 'factorToReference' | 'rounding'>

/** Round a value to a step (e.g. 0.01). step<=0 → no rounding. */
export function roundToStep(value: number, step: number): number {
  if (!step || step <= 0) return value
  return Math.round(value / step) * step
}

export class UomConversionError extends Error {}

/**
 * Convert `quantity` from `fromCode` to `toCode` using the supplied UoM table.
 * Throws UomConversionError if a code is unknown or the two are in different
 * categories. Same code → returned unchanged.
 */
export function convertUom(
  quantity: number,
  fromCode: string,
  toCode: string,
  uoms: UomLike[],
): number {
  if (fromCode === toCode) return quantity
  const from = uoms.find((u) => u.code === fromCode)
  const to = uoms.find((u) => u.code === toCode)
  if (!from) throw new UomConversionError(`Bilinmeyen birim: ${fromCode}`)
  if (!to) throw new UomConversionError(`Bilinmeyen birim: ${toCode}`)
  if (from.categoryId !== to.categoryId) {
    throw new UomConversionError(`${fromCode} → ${toCode} dönüşümü yapılamaz (farklı kategori)`)
  }
  const inReference = quantity * from.factorToReference
  const result = inReference / to.factorToReference
  return roundToStep(result, to.rounding)
}

/** True when two unit codes can be converted (same category, both known). */
export function isConvertible(fromCode: string, toCode: string, uoms: UomLike[]): boolean {
  if (fromCode === toCode) return true
  const from = uoms.find((u) => u.code === fromCode)
  const to = uoms.find((u) => u.code === toCode)
  return !!from && !!to && from.categoryId === to.categoryId
}
