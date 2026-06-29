import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { StockCount } from './entities/stock-count.entity'
import { StockCountLine } from './entities/stock-count-line.entity'
import { StockCountScan } from './entities/stock-count-scan.entity'
import { Product } from '../inventory/entities/product.entity'
import { ProductVariant } from '../inventory/entities/product-variant.entity'
import { ProductPackaging } from '../inventory/entities/product-packaging.entity'
import { ProductStock } from '../inventory/entities/product-stock.entity'
import { Category } from '../inventory/entities/category.entity'
import { Branch } from '../org/entities/branch.entity'
import { User } from '../iam/entities/user.entity'
import { InventoryModule } from '../inventory/inventory.module'
import { StocktakeController } from './stocktake.controller'
import { StocktakeService } from './stocktake.service'

// Stok/Envanter Sayımı — a count session snapshots expected on-hand (ProductStock
// for a branch) into lines, accumulates physical counts (barcode scan / manual),
// then on approval posts the difference to inventory as Sayım Fazlası/Eksiği
// movements (segregation of duties: creator ≠ approver). InventoryModule provides
// StockMovementsService/StockMovementTypesService for posting/reversing; ProductsService
// is not exported, so barcodes are resolved inline (ProductVariant/ProductPackaging/Product).
@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockCount,
      StockCountLine,
      StockCountScan,
      Product,
      ProductVariant,
      ProductPackaging,
      ProductStock,
      Category,
      Branch,
      User,
    ]),
    InventoryModule,
  ],
  controllers: [StocktakeController],
  providers: [StocktakeService],
})
export class StocktakeModule {}
