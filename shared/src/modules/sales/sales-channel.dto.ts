// Sales channel — a route through which products are sold (retail store, online
// shop, marketplace, wholesale, …). Master data that later resources (products)
// reference. The wire shape (DTO) shared by the backend, web and mobile.

// The kind of channel. Stored as a string; the UI maps each to a Turkish label.
export type SalesChannelType =
  | 'retail' // Perakende
  | 'wholesale' // Toptan
  | 'online' // Online / E-ticaret
  | 'marketplace' // Pazaryeri
  | 'b2b' // B2B / Kurumsal
  | 'distributor' // Distribütör
  | 'other' // Diğer

export const SALES_CHANNEL_TYPES: SalesChannelType[] = [
  'retail',
  'wholesale',
  'online',
  'marketplace',
  'b2b',
  'distributor',
  'other',
]

export interface SalesChannelDto {
  id: string
  /** Unique short code (e.g. "WEB", "PMARKET"). */
  code: string
  name: string
  type: SalesChannelType
  description: string
  isActive: boolean
  /** Marks the default channel for new products/orders. */
  isDefault: boolean
  /** Manual ordering in lists (ascending). */
  sortOrder: number
  /** Commission percentage charged on this channel (e.g. marketplaces), or null. */
  commissionRate: number | null
  /** ISO 4217 currency code the channel operates in (e.g. "TRY"). */
  currency: string
  /** Public URL for online channels. */
  website: string

  // İletişim / Yetkili (contact & authorized person)
  contactName: string
  contactTitle: string
  contactPhone: string
  contactEmail: string

  // Adres (address)
  country: string
  city: string
  district: string
  addressLine: string
  postalCode: string

  createdAt: string
  updatedAt: string
}

// Compact reference for embedding in other modules' DTOs (e.g. on a product).
export interface SalesChannelSummary {
  id: string
  code: string
  name: string
  type: SalesChannelType
}

export interface CreateSalesChannelRequest {
  code: string
  name: string
  type?: SalesChannelType
  description?: string
  isActive?: boolean
  isDefault?: boolean
  sortOrder?: number
  commissionRate?: number | null
  currency?: string
  website?: string
  contactName?: string
  contactTitle?: string
  contactPhone?: string
  contactEmail?: string
  country?: string
  city?: string
  district?: string
  addressLine?: string
  postalCode?: string
}

export type UpdateSalesChannelRequest = Partial<CreateSalesChannelRequest>
