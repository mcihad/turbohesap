import type { AxiosInstance } from 'axios'

import type {
  CreateProductRequest,
  ProductDto,
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
import type { IProductsService } from './products.service'

// Axios implementation → /api/inventory/products (+ nested sub-resources).
export class ProductsApiClient implements IProductsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(categoryId?: string): Promise<ProductDto[]> {
    return (
      await this.http.get<ProductDto[]>('/inventory/products', {
        params: categoryId ? { categoryId } : undefined,
      })
    ).data
  }

  async get(id: string): Promise<ProductDto> {
    return (await this.http.get<ProductDto>(`/inventory/products/${id}`)).data
  }

  async create(input: CreateProductRequest): Promise<ProductDto> {
    return (await this.http.post<ProductDto>('/inventory/products', input)).data
  }

  async update(id: string, input: UpdateProductRequest): Promise<ProductDto> {
    return (
      await this.http.patch<ProductDto>(`/inventory/products/${id}`, input)
    ).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/inventory/products/${id}`)
  }

  async sellable(categoryId?: string): Promise<SellableUnitDto[]> {
    return (
      await this.http.get<SellableUnitDto[]>('/inventory/products/sellable', {
        params: categoryId ? { categoryId } : undefined,
      })
    ).data
  }

  async stats(id: string, query?: ProductStatsQuery): Promise<ProductStatsDto> {
    return (
      await this.http.get<ProductStatsDto>(`/inventory/products/${id}/stats`, {
        params: query,
      })
    ).data
  }

  async byBarcode(code: string): Promise<BarcodeMatchDto> {
    return (
      await this.http.get<BarcodeMatchDto>(`/inventory/products/barcode/${encodeURIComponent(code)}`)
    ).data
  }

  // Variants ---------------------------------------------------------------
  async createVariant(
    productId: string,
    input: CreateProductVariantRequest,
  ): Promise<ProductVariantDto> {
    return (
      await this.http.post<ProductVariantDto>(
        `/inventory/products/${productId}/variants`,
        input,
      )
    ).data
  }

  async updateVariant(
    productId: string,
    variantId: string,
    input: UpdateProductVariantRequest,
  ): Promise<ProductVariantDto> {
    return (
      await this.http.patch<ProductVariantDto>(
        `/inventory/products/${productId}/variants/${variantId}`,
        input,
      )
    ).data
  }

  async removeVariant(productId: string, variantId: string): Promise<void> {
    await this.http.delete(
      `/inventory/products/${productId}/variants/${variantId}`,
    )
  }

  async generateVariants(
    productId: string,
    input?: GenerateVariantsRequest,
  ): Promise<ProductVariantDto[]> {
    return (
      await this.http.post<ProductVariantDto[]>(
        `/inventory/products/${productId}/variants/generate`,
        input ?? {},
      )
    ).data
  }

  async generateVariantsFromFeatures(
    productId: string,
    input: GenerateVariantsFromFeaturesRequest,
  ): Promise<ProductVariantDto[]> {
    return (
      await this.http.post<ProductVariantDto[]>(
        `/inventory/products/${productId}/variants/from-features`,
        input,
      )
    ).data
  }

  // Packagings -------------------------------------------------------------
  async createPackaging(
    productId: string,
    input: CreateProductPackagingRequest,
  ): Promise<ProductPackagingDto> {
    return (
      await this.http.post<ProductPackagingDto>(
        `/inventory/products/${productId}/packagings`,
        input,
      )
    ).data
  }

  async updatePackaging(
    productId: string,
    packagingId: string,
    input: UpdateProductPackagingRequest,
  ): Promise<ProductPackagingDto> {
    return (
      await this.http.patch<ProductPackagingDto>(
        `/inventory/products/${productId}/packagings/${packagingId}`,
        input,
      )
    ).data
  }

  async removePackaging(productId: string, packagingId: string): Promise<void> {
    await this.http.delete(
      `/inventory/products/${productId}/packagings/${packagingId}`,
    )
  }

  // Per-branch stock -------------------------------------------------------
  async setStock(
    productId: string,
    input: UpsertProductStockRequest,
  ): Promise<ProductStockDto> {
    return (
      await this.http.put<ProductStockDto>(
        `/inventory/products/${productId}/stock`,
        input,
      )
    ).data
  }

  async removeStock(productId: string, stockId: string): Promise<void> {
    await this.http.delete(`/inventory/products/${productId}/stock/${stockId}`)
  }

  // Per-channel prices -----------------------------------------------------
  async setChannelPrice(
    productId: string,
    input: UpsertProductChannelPriceRequest,
  ): Promise<ProductChannelPriceDto> {
    return (
      await this.http.put<ProductChannelPriceDto>(
        `/inventory/products/${productId}/channel-prices`,
        input,
      )
    ).data
  }

  async removeChannelPrice(
    productId: string,
    channelPriceId: string,
  ): Promise<void> {
    await this.http.delete(
      `/inventory/products/${productId}/channel-prices/${channelPriceId}`,
    )
  }
}
