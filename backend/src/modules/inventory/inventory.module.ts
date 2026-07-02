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
import { ProductBundleComponent } from './entities/product-bundle-component.entity'
import { ProductBundlesController } from './product-bundles.controller'
import { ProductBundlesService } from './product-bundles.service'
import { ProductStatsService } from './product-stats.service'
// Cross-module entity shapes (read-only) for per-product sales statistics.
import { InvoiceLine } from '../invoices/entities/invoice-line.entity'
import { Invoice } from '../invoices/entities/invoice.entity'
import { PosOrderLine } from '../pos/entities/pos-order-line.entity'
import { PosOrder } from '../pos/entities/pos-order.entity'
// Demirbaş & Zimmet (fixed assets + custody).
import { Employee } from '../hr/entities/employee.entity'
import { Asset } from './entities/asset.entity'
import { AssetAssignment } from './entities/asset-assignment.entity'
import { AssetTransfer } from './entities/asset-transfer.entity'
import { AssetMaintenance } from './entities/asset-maintenance.entity'
import { AssetVehicleLog } from './entities/asset-vehicle-log.entity'
import { AssetsController } from './assets.controller'
import { AssetsService } from './assets.service'
import { AssetAssignmentsController } from './asset-assignments.controller'
import { AssetTransfersController } from './asset-transfers.controller'
import { AssetCustodyService } from './asset-custody.service'
import { AssetMaintenanceController } from './asset-maintenance.controller'
import { AssetMaintenanceService } from './asset-maintenance.service'
import { AssetVehicleLogsController } from './asset-vehicle-logs.controller'
import { AssetVehicleLogsService } from './asset-vehicle-logs.service'
// Ölçü birimi (UoM) sistemi.
import { UomCategory } from './entities/uom-category.entity'
import { Uom } from './entities/uom.entity'
import { UomService } from './uom.service'
import { UomCategoriesController, UomsController } from './uom.controller'
// Stok operasyon altyapısı — maliyet (AVCO), rezervasyon, uygunluk (ATP).
import { ProductCost } from './entities/product-cost.entity'
import { StockReservation } from './entities/stock-reservation.entity'
import { CostService } from './cost.service'
import { ReservationsService } from './reservations.service'
import { AvailabilityService } from './availability.service'
import {
  AvailabilityController,
  ProductCostController,
  ReservationsController,
} from './stock-ops.controller'
// Üretim emri (read-only) — ATP'nin 'gelen' bileşeni (açık üretim emirleri).
import { ProductionOrder } from '../production/entities/production-order.entity'
// Sipariş belgeleri (read-only) — ATP'nin 'gelen' bileşeni (açık satınalma siparişleri).
import { OrderDocument } from '../orders/entities/order-document.entity'
import { OrderDocumentLine } from '../orders/entities/order-document-line.entity'

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
      ProductBundleComponent,
      InvoiceLine,
      Invoice,
      PosOrderLine,
      PosOrder,
      Branch,
      SalesChannel,
      // Demirbaş & Zimmet entities (+ Employee borrowed read-only for zimmet).
      Asset,
      AssetAssignment,
      AssetTransfer,
      AssetMaintenance,
      AssetVehicleLog,
      Employee,
      UomCategory,
      Uom,
      ProductCost,
      StockReservation,
      ProductionOrder,
      OrderDocument,
      OrderDocumentLine,
    ]),
  ],
  controllers: [
    CategoriesController,
    ProductsController,
    StockMovementTypesController,
    StockMovementsController,
    ProductModifiersController,
    ProductBundlesController,
    AssetsController,
    AssetAssignmentsController,
    AssetTransfersController,
    AssetMaintenanceController,
    AssetVehicleLogsController,
    UomCategoriesController,
    UomsController,
    ReservationsController,
    ProductCostController,
    AvailabilityController,
  ],
  providers: [
    CategoriesService,
    ProductsService,
    StockMovementTypesService,
    StockMovementsService,
    ProductModifiersService,
    ProductBundlesService,
    ProductStatsService,
    AssetsService,
    AssetCustodyService,
    AssetMaintenanceService,
    AssetVehicleLogsService,
    UomService,
    CostService,
    ReservationsService,
    AvailabilityService,
  ],
  // Exported so InvoicesModule/PosModule post/reverse stock movements and
  // ProductionModule reserves stock + reads/updates AVCO cost.
  exports: [
    StockMovementsService,
    StockMovementTypesService,
    ProductModifiersService,
    CostService,
    ReservationsService,
    AvailabilityService,
  ],
})
export class InventoryModule {}
