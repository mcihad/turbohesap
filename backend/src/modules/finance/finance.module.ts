import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CashAccount } from './entities/cash-account.entity'
import { BankAccount } from './entities/bank-account.entity'
import { FinanceTransaction } from './entities/finance-transaction.entity'
import { CashAccountsController } from './cash-accounts.controller'
import { CashAccountsService } from './cash-accounts.service'
import { BankAccountsController } from './bank-accounts.controller'
import { BankAccountsService } from './bank-accounts.service'
import { FinanceTransactionsController } from './finance-transactions.controller'
import { FinanceTransactionsService } from './finance-transactions.service'

@Module({
  imports: [TypeOrmModule.forFeature([CashAccount, BankAccount, FinanceTransaction])],
  controllers: [CashAccountsController, BankAccountsController, FinanceTransactionsController],
  providers: [CashAccountsService, BankAccountsService, FinanceTransactionsService],
  exports: [TypeOrmModule, CashAccountsService, BankAccountsService, FinanceTransactionsService],
})
export class FinanceModule {}
