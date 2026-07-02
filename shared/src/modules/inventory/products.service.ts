import type { Page } from '../../core/pagination'
import type {
  CreateProductRequest,
  ProductDto,
  ProductListQuery,
  UpdateProductRequest,
} from './product.dto'
import type {
  CreateProductVariantRequest,
  GenerateVariantsRequest,
  GenerateVariantsFromFeaturesRequest,
  ProductVariantDto,
  UpdateProductVariantRequest,
} from './product-variant.dto'
import type { ProductStatsDto, ProductStatsQuery } from './product-stats.dto'
import type { SellableUnitDto } from './product-sellable.dto'
import type { BarcodeMatchDto } from './product-barcode.dto'
import type {
  CreateProductPackagingRequest,
  ProductPackagingDto,
  UpdateProductPackagingRequest,
} from './product-packaging.dto'
import type {
  ProductStockDto,
  UpsertProductStockRequest,
} from './product-stock.dto'
import type {
  ProductChannelPriceDto,
  UpsertProductChannelPriceRequest,
} from './product-channel-price.dto'

// Contract for the inventory products resource (/api/inventory/products) and its
// nested sub-resources (variants, packagings, stock, channel prices).
export interface IProductsService {
  list(categoryId?: string): Promise<ProductDto[]>
  listPage(query?: ProductListQuery): Promise<Page<ProductDto>>
  get(id: string): Promise<ProductDto>
  create(input: CreateProductRequest): Promise<ProductDto>
  update(id: string, input: UpdateProductRequest): Promise<ProductDto>
  remove(id: string): Promise<void>

  /** Flattened sellable units: each variant of a variant-product (parent hidden)
   *  plus each variant-less product itself. Powers the stock list. */
  sellable(categoryId?: string): Promise<SellableUnitDto[]>
  /** Per-product sales/stock analytics (works even when trackStock is off). */
  stats(id: string, query?: ProductStatsQuery): Promise<ProductStatsDto>
  /** Resolve a scanned barcode to a product/variant/packaging (404 if unknown). */
  byBarcode(code: string): Promise<BarcodeMatchDto>

  // Variants — /:id/variants
  createVariant(
    productId: string,
    input: CreateProductVariantRequest,
  ): Promise<ProductVariantDto>
  updateVariant(
    productId: string,
    variantId: string,
    input: UpdateProductVariantRequest,
  ): Promise<ProductVariantDto>
  removeVariant(productId: string, variantId: string): Promise<void>
  /** Create every missing attribute combination from `variantAttributes`. */
  generateVariants(
    productId: string,
    input?: GenerateVariantsRequest,
  ): Promise<ProductVariantDto[]>
  /** Set variantAttributes from category feature fields, then generate. */
  generateVariantsFromFeatures(
    productId: string,
    input: GenerateVariantsFromFeaturesRequest,
  ): Promise<ProductVariantDto[]>

  // Packagings (unit multipliers) — /:id/packagings
  createPackaging(
    productId: string,
    input: CreateProductPackagingRequest,
  ): Promise<ProductPackagingDto>
  updatePackaging(
    productId: string,
    packagingId: string,
    input: UpdateProductPackagingRequest,
  ): Promise<ProductPackagingDto>
  removePackaging(productId: string, packagingId: string): Promise<void>

  // Per-branch stock — /:id/stock
  setStock(
    productId: string,
    input: UpsertProductStockRequest,
  ): Promise<ProductStockDto>
  removeStock(productId: string, stockId: string): Promise<void>

  // Per-channel prices — /:id/channel-prices
  setChannelPrice(
    productId: string,
    input: UpsertProductChannelPriceRequest,
  ): Promise<ProductChannelPriceDto>
  removeChannelPrice(productId: string, channelPriceId: string): Promise<void>
}
