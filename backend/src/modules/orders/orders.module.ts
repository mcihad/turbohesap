import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { OrderDocument } from './entities/order-document.entity'
import { OrderDocumentLine } from './entities/order-document-line.entity'
import { Contact } from '../contacts/entities/contact.entity'
import { Product } from '../inventory/entities/product.entity'
import { ProductVariant } from '../inventory/entities/product-variant.entity'
import { InventoryModule } from '../inventory/inventory.module'
import { InvoicesModule } from '../invoices/invoices.module'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  // Teklif → Sipariş → İrsaliye → Fatura, one entity discriminated by `kind`.
  // Product/ProductVariant resolve server-side line pricing; InventoryModule
  // posts İrsaliye stock movements; InvoicesModule converts a document → Fatura.
  imports: [
    TypeOrmModule.forFeature([OrderDocument, OrderDocumentLine, Product, ProductVariant, Contact]),
    InventoryModule,
    InvoicesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
