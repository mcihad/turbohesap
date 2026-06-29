// Stocktake permissions — deliberately granular for segregation of duties:
// the person who counts should not be the person who approves the adjustment.
export const StocktakePermissions = {
  read: 'stocktake.read',
  /** Plan / start a count session. */
  create: 'stocktake.create',
  /** Perform the counting (scan / enter quantities). */
  count: 'stocktake.count',
  /** Review variances, request recounts, set reason codes. */
  review: 'stocktake.review',
  /** Approve the count and POST the stock adjustments. */
  approve: 'stocktake.approve',
  cancel: 'stocktake.cancel',
} as const

export type StocktakePermission = (typeof StocktakePermissions)[keyof typeof StocktakePermissions]
