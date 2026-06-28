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
import { ProductModifierGroup } from './entities/product-modifier-group.entity'
import { ProductModifierOption } from './entities/product-modifier-option.entity'
import { ProductModifierLink } from './entities/product-modifier-link.entity'
import { ProductModifiersController } from './product-modifiers.controller'
import { ProductModifiersService } from './product-modifiers.service'

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
      ProductModifierGroup,
      ProductModifierOption,
      ProductModifierLink,
      Branch,
      SalesChannel,
    ]),
  ],
  controllers: [
    CategoriesController,
    ProductsController,
    StockMovementTypesController,
    StockMovementsController,
    ProductModifiersController,
  ],
  providers: [
    CategoriesService,
    ProductsService,
    StockMovementTypesService,
    StockMovementsService,
    ProductModifiersService,
  ],
  // Exported so InvoicesModule/PosModule can post/reverse stock movements.
  exports: [StockMovementsService, StockMovementTypesService, ProductModifiersService],
})
export class InventoryModule {}
