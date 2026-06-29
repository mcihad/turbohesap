// Quantity formatter for the Sayım (stocktake) module — Turkish locale, up to 3
// decimals (e.g. weights), no trailing zeroes for whole units.
export function formatQty(value: number): string {
  try {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(value)
  } catch {
    return String(value)
  }
}

// A signed quantity (variance): "+3" / "−2" with the Turkish minus glyph.
export function formatSignedQty(value: number): string {
  if (value === 0) return '0'
  const abs = formatQty(Math.abs(value))
  return value > 0 ? `+${abs}` : `−${abs}`
}
