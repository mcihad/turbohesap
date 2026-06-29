import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'

import {
  InventoryPermissions,
  type BarcodeMatchDto,
  type ProductChannelPriceDto,
  type ProductDto,
  type ProductPackagingDto,
  type ProductStatsDto,
  type ProductStatsQuery,
  type ProductStockDto,
  type ProductVariantDto,
  type SellableUnitDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import {
  CreateProductVariantDto,
  GenerateVariantsDto,
  GenerateVariantsFromFeaturesDto,
  UpdateProductVariantDto,
} from './dto/product-variant.dto'
import { ProductStatsService } from './product-stats.service'
import {
  CreateProductPackagingDto,
  UpdateProductPackagingDto,
} from './dto/product-packaging.dto'
import { UpsertProductStockDto } from './dto/product-stock.dto'
import { UpsertProductChannelPriceDto } from './dto/product-channel-price.dto'
import { ProductsService } from './products.service'

@Controller('inventory/products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly stats: ProductStatsService,
  ) {}

  @Get()
  @RequirePermissions(InventoryPermissions.productsRead)
  list(@Query('categoryId') categoryId?: string): Promise<ProductDto[]> {
    return this.products.list(categoryId)
  }

  // Declared BEFORE :id so "sellable" is not captured as a product id.
  @Get('sellable')
  @RequirePermissions(InventoryPermissions.productsRead)
  sellable(@Query('categoryId') categoryId?: string): Promise<SellableUnitDto[]> {
    return this.products.sellable(categoryId)
  }

  // BEFORE :id — resolve a scanned barcode to a product/variant/packaging.
  @Get('barcode/:code')
  @RequirePermissions(InventoryPermissions.productsRead)
  byBarcode(@Param('code') code: string): Promise<BarcodeMatchDto> {
    return this.products.byBarcode(code)
  }

  @Get(':id')
  @RequirePermissions(InventoryPermissions.productsRead)
  get(@Param('id') id: string): Promise<ProductDto> {
    return this.products.get(id)
  }

  @Get(':id/stats')
  @RequirePermissions(InventoryPermissions.productsRead)
  getStats(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: ProductStatsQuery['granularity'],
  ): Promise<ProductStatsDto> {
    return this.stats.stats(id, { from, to, granularity })
  }

  @Post()
  @RequirePermissions(InventoryPermissions.productsWrite)
  create(@Body() dto: CreateProductDto): Promise<ProductDto> {
    return this.products.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(InventoryPermissions.productsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductDto> {
    return this.products.update(id, dto)
  }

  // Deleting a product needs its own, stronger permission.
  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.productsDelete)
  async remove(@Param('id') id: string): Promise<void> {
    await this.products.remove(id)
  }

  // --- Variants ----------------------------------------------------------
  @Post(':id/variants/generate')
  @RequirePermissions(InventoryPermissions.productsWrite)
  generateVariants(
    @Param('id') id: string,
    @Body() dto: GenerateVariantsDto,
  ): Promise<ProductVariantDto[]> {
    return this.products.generateVariants(id, dto)
  }

  @Post(':id/variants/from-features')
  @RequirePermissions(InventoryPermissions.productsWrite)
  generateVariantsFromFeatures(
    @Param('id') id: string,
    @Body() dto: GenerateVariantsFromFeaturesDto,
  ): Promise<ProductVariantDto[]> {
    return this.products.generateVariantsFromFeatures(id, dto)
  }

  @Post(':id/variants')
  @RequirePermissions(InventoryPermissions.productsWrite)
  createVariant(
    @Param('id') id: string,
    @Body() dto: CreateProductVariantDto,
  ): Promise<ProductVariantDto> {
    return this.products.createVariant(id, dto)
  }

  @Patch(':id/variants/:variantId')
  @RequirePermissions(InventoryPermissions.productsWrite)
  updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ): Promise<ProductVariantDto> {
    return this.products.updateVariant(id, variantId, dto)
  }

  @Delete(':id/variants/:variantId')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.productsWrite)
  async removeVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ): Promise<void> {
    await this.products.removeVariant(id, variantId)
  }

  // --- Packagings --------------------------------------------------------
  @Post(':id/packagings')
  @RequirePermissions(InventoryPermissions.productsWrite)
  createPackaging(
    @Param('id') id: string,
    @Body() dto: CreateProductPackagingDto,
  ): Promise<ProductPackagingDto> {
    return this.products.createPackaging(id, dto)
  }

  @Patch(':id/packagings/:packagingId')
  @RequirePermissions(InventoryPermissions.productsWrite)
  updatePackaging(
    @Param('id') id: string,
    @Param('packagingId') packagingId: string,
    @Body() dto: UpdateProductPackagingDto,
  ): Promise<ProductPackagingDto> {
    return this.products.updatePackaging(id, packagingId, dto)
  }

  @Delete(':id/packagings/:packagingId')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.productsWrite)
  async removePackaging(
    @Param('id') id: string,
    @Param('packagingId') packagingId: string,
  ): Promise<void> {
    await this.products.removePackaging(id, packagingId)
  }

  // --- Per-branch stock (own permission) ---------------------------------
  @Put(':id/stock')
  @RequirePermissions(InventoryPermissions.productsStock)
  setStock(
    @Param('id') id: string,
    @Body() dto: UpsertProductStockDto,
  ): Promise<ProductStockDto> {
    return this.products.setStock(id, dto)
  }

  @Delete(':id/stock/:stockId')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.productsStock)
  async removeStock(
    @Param('id') id: string,
    @Param('stockId') stockId: string,
  ): Promise<void> {
    await this.products.removeStock(id, stockId)
  }

  // --- Per-channel prices ------------------------------------------------
  @Put(':id/channel-prices')
  @RequirePermissions(InventoryPermissions.productsWrite)
  setChannelPrice(
    @Param('id') id: string,
    @Body() dto: UpsertProductChannelPriceDto,
  ): Promise<ProductChannelPriceDto> {
    return this.products.setChannelPrice(id, dto)
  }

  @Delete(':id/channel-prices/:channelPriceId')
  @HttpCode(204)
  @RequirePermissions(InventoryPermissions.productsWrite)
  async removeChannelPrice(
    @Param('id') id: string,
    @Param('channelPriceId') channelPriceId: string,
  ): Promise<void> {
    await this.products.removeChannelPrice(id, channelPriceId)
  }
}
