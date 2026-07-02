import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Product } from '../inventory/entities/product.entity'
import { Contact } from '../contacts/entities/contact.entity'
import { OrderDocument } from '../orders/entities/order-document.entity'
import { OrderDocumentLine } from '../orders/entities/order-document-line.entity'
import { InventoryModule } from '../inventory/inventory.module'
import { WorkCenter } from './entities/work-center.entity'
import { Bom } from './entities/bom.entity'
import { BomComponent } from './entities/bom-component.entity'
import { BomByproduct } from './entities/bom-byproduct.entity'
import { BomOperation } from './entities/bom-operation.entity'
import { ProductionOrder } from './entities/production-order.entity'
import { ProductionOrderComponent } from './entities/production-order-component.entity'
import { ProductionOrderByproduct } from './entities/production-order-byproduct.entity'
import { WorkOrder } from './entities/work-order.entity'
import { WorkOrderTimeLog } from './entities/work-order-time-log.entity'
import { SubcontractDispatch } from './entities/subcontract-dispatch.entity'
import { SubcontractDispatchLine } from './entities/subcontract-dispatch-line.entity'
import { ReorderRule } from './entities/reorder-rule.entity'
import { PlanningRun } from './entities/planning-run.entity'
import { PlanningSuggestion } from './entities/planning-suggestion.entity'
import { QualityCheck } from './entities/quality-check.entity'
import { Lot } from './entities/lot.entity'
import { ManufacturingOrderLot } from './entities/manufacturing-order-lot.entity'
import { WorkCentersService } from './work-centers.service'
import { BomsService } from './boms.service'
import { ManufacturingOrdersService } from './manufacturing-orders.service'
import { WorkOrdersService } from './work-orders.service'
import { SubcontractDispatchesService } from './subcontract-dispatches.service'
import { ReorderRulesService } from './reorder-rules.service'
import { PlanningService } from './planning.service'
import { QualityChecksService } from './quality-checks.service'
import { LotsService } from './lots.service'
import { WorkCentersController } from './work-centers.controller'
import { BomsController } from './boms.controller'
import { ManufacturingOrdersController } from './manufacturing-orders.controller'
import { WorkOrdersController } from './work-orders.controller'
import {
  SubcontractDispatchesController,
  SubcontractStockController,
} from './subcontract-dispatches.controller'
import { PlanningController, ReorderRulesController } from './planning.controller'
import { QualityChecksController } from './quality-checks.controller'
import { LotLinksController, LotsController } from './lots.controller'

// Üretim (manufacturing / MRP). Master data (iş merkezi + reçete) + yürütme
// (Üretim Emri + İş Emri). Stok/maliyet/rezervasyon etkileri InventoryModule'ün
// servisleriyle (StockMovementsService, CostService, ReservationsService) yapılır.
@Module({
  imports: [
    InventoryModule,
    TypeOrmModule.forFeature([
      WorkCenter,
      Bom,
      BomComponent,
      BomByproduct,
      BomOperation,
      ProductionOrder,
      ProductionOrderComponent,
      ProductionOrderByproduct,
      WorkOrder,
      WorkOrderTimeLog,
      SubcontractDispatch,
      SubcontractDispatchLine,
      ReorderRule,
      PlanningRun,
      PlanningSuggestion,
      QualityCheck,
      Lot,
      ManufacturingOrderLot,
      // Cross-module read for product names/validation + fasoncu (Contact) +
      // açık sipariş talebi (OrderDocument — MTO/planlama).
      Product,
      Contact,
      OrderDocument,
      OrderDocumentLine,
    ]),
  ],
  controllers: [
    WorkCentersController,
    BomsController,
    ManufacturingOrdersController,
    WorkOrdersController,
    SubcontractDispatchesController,
    SubcontractStockController,
    ReorderRulesController,
    PlanningController,
    QualityChecksController,
    LotsController,
    LotLinksController,
  ],
  providers: [
    WorkCentersService,
    BomsService,
    ManufacturingOrdersService,
    WorkOrdersService,
    SubcontractDispatchesService,
    ReorderRulesService,
    PlanningService,
    QualityChecksService,
    LotsService,
  ],
})
export class ProductionModule {}
