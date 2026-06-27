// Per-branch stock — on-hand quantity of a product (or a specific variant) at a
// branch. Reuses the org `branches` as stock locations (ERPNext Bin / Odoo
// stock.quant). `branchId` null = general/unassigned stock; `variantId` null =
// the simple product itself.

import type { BranchSummary } from '../org/branch.dto'

export interface ProductStockDto {
  id: string
  productId: string
  variantId: string | null
  /** Label of the variant this row is for, if any (e.g. "Kırmızı / M"). */
  variantLabel: string | null
  branchId: string | null
  branch: BranchSummary | null
  quantity: number
  createdAt: string
  updatedAt: string
}

// Set the absolute on-hand quantity for one (variant?, branch?) cell.
export interface UpsertProductStockRequest {
  branchId?: string | null
  variantId?: string | null
  quantity: number
}
