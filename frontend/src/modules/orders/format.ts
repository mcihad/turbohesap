// Money formatter for the Siparişler (orders) module — Turkish locale currency.
// Falls back to a plain "value currency" string if Intl rejects the currency.
export function formatMoney(value: number, currency: string = 'TRY'): string {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
    }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}
