import type { SalesChannelType } from '@turbohesap/shared'

// Turkish labels for sales channel types (UI only — the wire value is the key).
export const SALES_CHANNEL_TYPE_LABELS: Record<SalesChannelType, string> = {
  retail: 'Perakende',
  wholesale: 'Toptan',
  online: 'Online / E-ticaret',
  marketplace: 'Pazaryeri',
  b2b: 'B2B / Kurumsal',
  distributor: 'Distribütör',
  other: 'Diğer',
}

export function salesChannelTypeLabel(type: SalesChannelType): string {
  return SALES_CHANNEL_TYPE_LABELS[type] ?? type
}
