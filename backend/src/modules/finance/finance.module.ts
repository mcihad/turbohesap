import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CashAccount } from './entities/cash-account.entity'
import { BankAccount } from './entities/bank-account.entity'
import { CashAccountsController } from './cash-accounts.controller'
import { CashAccountsService } from './cash-accounts.service'
import { BankAccountsController } from './bank-accounts.controller'
import { BankAccountsService } from './bank-accounts.service'

@Module({
  imports: [TypeOrmModule.forFeature([CashAccount, BankAccount])],
  controllers: [CashAccountsController, BankAccountsController],
  providers: [CashAccountsService, BankAccountsService],
  exports: [TypeOrmModule],
})
export class FinanceModule {}
