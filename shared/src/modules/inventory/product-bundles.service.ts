import type {
  ProductBundleComponentDto,
  SetProductBundleRequest,
} from './product-bundle.dto'

// Contract for a product's POS bundle components (/inventory/products/:id/bundle)
// plus a bulk map for POS preloading (which products have bundles).
export interface IProductBundlesService {
  /** Bundle components configured for a product. */
  getForProduct(productId: string): Promise<ProductBundleComponentDto[]>
  /** Replace the full component set for a product. */
  setForProduct(
    productId: string,
    input: SetProductBundleRequest,
  ): Promise<ProductBundleComponentDto[]>
  /** productId → its bundle components (only products with ≥1 component). */
  bundleMap(): Promise<Record<string, ProductBundleComponentDto[]>>
}
