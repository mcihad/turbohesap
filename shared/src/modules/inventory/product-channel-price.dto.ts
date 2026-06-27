// Per-channel prices — a product's (or variant's) sale price on a specific sales
// channel. Reuses the `sales.channels` as price lists (Odoo pricelist / ERPNext
// Item Price per Price List). Overrides the base/variant price for that channel.

import type { SalesChannelSummary } from '../sales/sales-channel.dto'

export interface ProductChannelPriceDto {
  id: string
  productId: string
  variantId: string | null
  variantLabel: string | null
  channelId: string
  channel: SalesChannelSummary | null
  salePrice: number
  currency: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Set the price for one (variant?, channel) cell.
export interface UpsertProductChannelPriceRequest {
  channelId: string
  salePrice: number
  variantId?: string | null
  currency?: string | null
  isActive?: boolean
}
