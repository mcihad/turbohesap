import type { AxiosInstance } from 'axios'

import type {
  ProductBundleComponentDto,
  SetProductBundleRequest,
} from './product-bundle.dto'
import type { IProductBundlesService } from './product-bundles.service'

// Axios implementation → /api/inventory. The bundle-map route is deliberately
// NOT under products/* so the products `:id` route does not shadow it.
export class ProductBundlesApiClient implements IProductBundlesService {
  constructor(private readonly http: AxiosInstance) {}

  async getForProduct(productId: string): Promise<ProductBundleComponentDto[]> {
    return (
      await this.http.get<ProductBundleComponentDto[]>(
        `/inventory/products/${productId}/bundle`,
      )
    ).data
  }

  async setForProduct(
    productId: string,
    input: SetProductBundleRequest,
  ): Promise<ProductBundleComponentDto[]> {
    return (
      await this.http.put<ProductBundleComponentDto[]>(
        `/inventory/products/${productId}/bundle`,
        input,
      )
    ).data
  }

  async bundleMap(): Promise<Record<string, ProductBundleComponentDto[]>> {
    return (
      await this.http.get<Record<string, ProductBundleComponentDto[]>>(
        '/inventory/bundle-map',
      )
    ).data
  }
}
