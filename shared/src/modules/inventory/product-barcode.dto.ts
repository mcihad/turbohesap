// Result of resolving a scanned barcode to a concrete sellable/stockable unit.
// Matches a product's primary barcode, a variant barcode, or a packaging barcode
// (a pack carries `packQty` base units). Powers fast in-app barcode scanning
// (e.g. the stocktake counter) without loading the whole catalogue.

export interface BarcodeMatchDto {
  productId: string
  variantId: string | null
  /** Set when the barcode belonged to a packaging (pack of `packQty` units). */
  packagingId: string | null
  /** Base-unit quantity represented by one scan (1 for product/variant, the
   *  packaging multiplier for a pack barcode). */
  packQty: number
  code: string
  name: string
  unit: string
  /** The matched barcode value. */
  barcode: string
}
