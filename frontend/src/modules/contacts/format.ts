import type { BalanceSide } from '@turbohesap/shared'

/** Format an amount as Turkish currency (falls back to "<n> <code>"). */
export function formatMoney(value: number, currency = 'TRY'): string {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

/** Turkish label for a balance side. */
export function balanceSideLabel(side: BalanceSide): string {
  return side === 'debit' ? 'Borç' : 'Alacak'
}

/** A balance reads green when the contact owes us (debit), red when we owe them. */
export function balanceTone(side: BalanceSide): string {
  return side === 'debit' ? 'text-emerald-600' : 'text-red-600'
}
