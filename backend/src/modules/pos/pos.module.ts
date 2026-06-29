import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PosRegister } from './entities/pos-register.entity'
import { PosSession } from './entities/pos-session.entity'
import { PosOrder } from './entities/pos-order.entity'
import { PosOrderLine } from './entities/pos-order-line.entity'
import { PosOrderLineModifier } from './entities/pos-order-line-modifier.entity'
import { PosPayment } from './entities/pos-payment.entity'
import { PosFloor } from './entities/pos-floor.entity'
import { PosTable } from './entities/pos-table.entity'
// Cross-module entity shapes (AGENTS §4): Branch/Channel for register context,
// Product for trackStock, Contact* for cari ledger, Finance* for kasa/banka, User.
import { Branch } from '../org/entities/branch.entity'
import { SalesChannel } from '../sales/entities/sales-channel.entity'
import { Product } from '../inventory/entities/product.entity'
import { ProductVariant } from '../inventory/entities/product-variant.entity'
import { ProductChannelPrice } from '../inventory/entities/product-channel-price.entity'
import { ProductModifierOption } from '../inventory/entities/product-modifier-option.entity'
import { ProductModifierGroup } from '../inventory/entities/product-modifier-group.entity'
import { ProductBundleComponent } from '../inventory/entities/product-bundle-component.entity'
import { Contact } from '../contacts/entities/contact.entity'
import { ContactTransaction } from '../contacts/entities/contact-transaction.entity'
import { FinanceTransaction } from '../finance/entities/finance-transaction.entity'
import { User } from '../iam/entities/user.entity'
import { InventoryModule } from '../inventory/inventory.module'

import { PosRegistersService } from './pos-registers.service'
import { PosRegistersController } from './pos-registers.controller'
import { PosSessionsService } from './pos-sessions.service'
import { PosSessionsController } from './pos-sessions.controller'
import { PosOrdersService } from './pos-orders.service'
import { PosOrdersController } from './pos-orders.controller'
import { PosTablesService } from './pos-tables.service'
import { PosTablesController } from './pos-tables.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PosRegister,
      PosSession,
      PosOrder,
      PosOrderLine,
      PosOrderLineModifier,
      PosPayment,
      PosFloor,
      PosTable,
      Branch,
      SalesChannel,
      Product,
      ProductVariant,
      ProductChannelPrice,
      ProductModifierOption,
      ProductModifierGroup,
      ProductBundleComponent,
      Contact,
      ContactTransaction,
      FinanceTransaction,
      User,
    ]),
    // Provides StockMovementsService + StockMovementTypesService for settle/void.
    InventoryModule,
  ],
  controllers: [
    PosRegistersController,
    PosSessionsController,
    PosOrdersController,
    PosTablesController,
  ],
  providers: [PosRegistersService, PosSessionsService, PosOrdersService, PosTablesService],
})
export class PosModule {}
