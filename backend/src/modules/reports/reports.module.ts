import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Contact } from '../contacts/entities/contact.entity'
import { ContactTransaction } from '../contacts/entities/contact-transaction.entity'
import { Opportunity } from '../contacts/entities/opportunity.entity'
import { Pipeline } from '../contacts/entities/pipeline.entity'
import { PipelineStage } from '../contacts/entities/pipeline-stage.entity'
import { BankAccount } from '../finance/entities/bank-account.entity'
import { CashAccount } from '../finance/entities/cash-account.entity'
import { FinanceTransaction } from '../finance/entities/finance-transaction.entity'
import { Category } from '../inventory/entities/category.entity'
import { Product } from '../inventory/entities/product.entity'
import { ProductStock } from '../inventory/entities/product-stock.entity'
import { StockMovement } from '../inventory/entities/stock-movement.entity'
import { Invoice } from '../invoices/entities/invoice.entity'
import { InvoiceLine } from '../invoices/entities/invoice-line.entity'
import { InvoicePayment } from '../invoices/entities/invoice-payment.entity'
import { PosOrder } from '../pos/entities/pos-order.entity'
import { PosOrderLine } from '../pos/entities/pos-order-line.entity'
import { PosPayment } from '../pos/entities/pos-payment.entity'
import { PosRegister } from '../pos/entities/pos-register.entity'
import { PosSession } from '../pos/entities/pos-session.entity'
import { SalesChannel } from '../sales/entities/sales-channel.entity'
import { Branch } from '../org/entities/branch.entity'
import { ContactsStatsService } from './contacts-stats.service'
import { FinanceStatsService } from './finance-stats.service'
import { InventoryStatsService } from './inventory-stats.service'
import { InvoicesStatsService } from './invoices-stats.service'
import { OverviewStatsService } from './overview-stats.service'
import { PosStatsService } from './pos-stats.service'
import { ReportsController } from './reports.controller'
import { SalesStatsService } from './sales-stats.service'

// Cross-module analytics. Read-only access to other modules' entities via
// TypeOrmModule.forFeature (autoLoadEntities yields the repos). CacheModule is
// @Global, so CACHE_DRIVER injects without importing it here.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PosOrder,
      PosOrderLine,
      PosPayment,
      PosRegister,
      PosSession,
      Invoice,
      InvoiceLine,
      InvoicePayment,
      FinanceTransaction,
      CashAccount,
      BankAccount,
      Product,
      ProductStock,
      StockMovement,
      Category,
      Contact,
      ContactTransaction,
      Opportunity,
      Pipeline,
      PipelineStage,
      SalesChannel,
      Branch,
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    OverviewStatsService,
    PosStatsService,
    InventoryStatsService,
    FinanceStatsService,
    InvoicesStatsService,
    ContactsStatsService,
    SalesStatsService,
  ],
})
export class ReportsModule {}
