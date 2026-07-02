import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Contact } from '../contacts/entities/contact.entity'
import { ContactTransaction } from '../contacts/entities/contact-transaction.entity'
import { DocumentCategory } from '../documents/entities/document-category.entity'
import { DocumentsModule } from '../documents/documents.module'
import { CashAccount } from './entities/cash-account.entity'
import { BankAccount } from './entities/bank-account.entity'
import { FinanceTransaction } from './entities/finance-transaction.entity'
import { FinancialInstrument } from './entities/financial-instrument.entity'
import { CashAccountsController } from './cash-accounts.controller'
import { CashAccountsService } from './cash-accounts.service'
import { BankAccountsController } from './bank-accounts.controller'
import { BankAccountsService } from './bank-accounts.service'
import { FinanceTransactionsController } from './finance-transactions.controller'
import { FinanceTransactionsService } from './finance-transactions.service'
import { FinancialInstrumentsController } from './financial-instruments.controller'
import { FinancialInstrumentsService } from './financial-instruments.service'

@Module({
  imports: [
    // Cross-module entity shapes (AGENTS §4): Contact/ContactTransaction for the
    // çek/senet cari posting (same precedent as invoices.module.ts),
    // DocumentCategory for the idempotent "Çek/Senet" evrak kategorisi lookup.
    // DocumentsModule provides DocumentsService (auto-creates/syncs/unlinks the
    // linked evrak — see financial-instruments.service.ts).
    TypeOrmModule.forFeature([
      CashAccount,
      BankAccount,
      FinanceTransaction,
      FinancialInstrument,
      Contact,
      ContactTransaction,
      DocumentCategory,
    ]),
    DocumentsModule,
  ],
  controllers: [
    CashAccountsController,
    BankAccountsController,
    FinanceTransactionsController,
    FinancialInstrumentsController,
  ],
  providers: [
    CashAccountsService,
    BankAccountsService,
    FinanceTransactionsService,
    FinancialInstrumentsService,
  ],
  exports: [TypeOrmModule, CashAccountsService, BankAccountsService, FinanceTransactionsService],
})
export class FinanceModule {}
