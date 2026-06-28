import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Branch } from '../org/entities/branch.entity'
import { SalesChannel } from '../sales/entities/sales-channel.entity'
import { Category } from './entities/category.entity'
import { Product } from './entities/product.entity'
import { ProductChannelPrice } from './entities/product-channel-price.entity'
import { ProductPackaging } from './entities/product-packaging.entity'
import { ProductStock } from './entities/product-stock.entity'
import { ProductVariant } from './entities/product-variant.entity'
import { StockMovement } from './entities/stock-movement.entity'
import { StockMovementType } from './entities/stock-movement-type.entity'
import { CategoriesController } from './categories.controller'
import { CategoriesService } from './categories.service'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'
import { StockMovementTypesController } from './stock-movement-types.controller'
import { StockMovementTypesService } from './stock-movement-types.service'
import { StockMovementsController } from './stock-movements.controller'
import { StockMovementsService } from './stock-movements.service'

// Envanter — product categories (a tree, with per-category custom field schemas)
// and products with variants, packagings, per-branch stock and per-channel
// prices. Branches/channels are read here (as stock locations / price lists) so
// their repositories are registered too. Served under /api/inventory/<resource>.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Product,
      ProductVariant,
      ProductPackaging,
      ProductStock,
      ProductChannelPrice,
      StockMovement,
      StockMovementType,
      Branch,
      SalesChannel,
    ]),
  ],
  controllers: [
    CategoriesController,
    ProductsController,
    StockMovementTypesController,
    StockMovementsController,
  ],
  providers: [CategoriesService, ProductsService, StockMovementTypesService, StockMovementsService],
  // Exported so InvoicesModule can post/reverse stock movements on issue/cancel.
  exports: [StockMovementsService, StockMovementTypesService],
})
export class InventoryModule {}
