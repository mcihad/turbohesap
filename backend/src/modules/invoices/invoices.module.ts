import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Invoice } from './entities/invoice.entity'
import { InvoiceLine } from './entities/invoice-line.entity'
import { InvoicePayment } from './entities/invoice-payment.entity'
import { Contact } from '../contacts/entities/contact.entity'
import { ContactTransaction } from '../contacts/entities/contact-transaction.entity'
import { ContactAddress } from '../contacts/entities/contact-address.entity'
import { Product } from '../inventory/entities/product.entity'
import { FinanceTransaction } from '../finance/entities/finance-transaction.entity'
import { CashAccount } from '../finance/entities/cash-account.entity'
import { BankAccount } from '../finance/entities/bank-account.entity'
import { User } from '../iam/entities/user.entity'
import { InventoryModule } from '../inventory/inventory.module'
import { InvoicesController } from './invoices.controller'
import { InvoicesService } from './invoices.service'

@Module({
  // Cross-module entity shapes (AGENTS §4): Contact* for cari-ledger + UBL party,
  // Product for trackStock, Finance* for kasa/banka payments, User for branch authz.
  // InventoryModule provides the stock-movement services (issue posts movements).
  imports: [
    TypeOrmModule.forFeature([
      Invoice, InvoiceLine, InvoicePayment, Contact, ContactTransaction, ContactAddress,
      Product, FinanceTransaction, CashAccount, BankAccount, User,
    ]),
    InventoryModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  // Exported so the orders module can convert a document into a draft invoice.
  exports: [InvoicesService],
})
export class InvoicesModule {}
