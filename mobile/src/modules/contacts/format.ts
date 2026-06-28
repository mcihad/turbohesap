import type { BalanceSide } from '@turbohesap/shared'

export function formatMoney(value: number, currency = 'TRY'): string {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

export function balanceSideLabel(side: BalanceSide): string {
  return side === 'debit' ? 'Borç' : 'Alacak'
}
