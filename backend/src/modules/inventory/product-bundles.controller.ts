import { Body, Controller, Get, Param, Put } from '@nestjs/common'

import {
  InventoryPermissions,
  type ProductBundleComponentDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ProductBundlesService } from './product-bundles.service'
import { SetProductBundleDto } from './dto/product-bundle.dto'

@Controller('inventory')
export class ProductBundlesController {
  constructor(private readonly bundles: ProductBundlesService) {}

  // NOT under products/* — that path is owned by the products controller's
  // :id route, which would capture "bundle-map" as a productId (500).
  @Get('bundle-map')
  @RequirePermissions(InventoryPermissions.productsRead)
  bundleMap(): Promise<Record<string, ProductBundleComponentDto[]>> {
    return this.bundles.bundleMap()
  }

  @Get('products/:productId/bundle')
  @RequirePermissions(InventoryPermissions.productsRead)
  getForProduct(@Param('productId') productId: string): Promise<ProductBundleComponentDto[]> {
    return this.bundles.getForProduct(productId)
  }

  @Put('products/:productId/bundle')
  @RequirePermissions(InventoryPermissions.productsWrite)
  setForProduct(
    @Param('productId') productId: string,
    @Body() dto: SetProductBundleDto,
  ): Promise<ProductBundleComponentDto[]> {
    return this.bundles.setForProduct(productId, dto)
  }
}
