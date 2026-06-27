import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common'

import { FinancePermissions, type BankAccountDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto/bank-account.dto'
import { BankAccountsService } from './bank-accounts.service'

@Controller('finance/bank-accounts')
export class BankAccountsController {
  constructor(private readonly bankAccounts: BankAccountsService) {}

  @Get()
  @RequirePermissions(FinancePermissions.bankAccountsRead)
  list(): Promise<BankAccountDto[]> {
    return this.bankAccounts.list()
  }

  @Get(':id')
  @RequirePermissions(FinancePermissions.bankAccountsRead)
  get(@Param('id') id: string): Promise<BankAccountDto> {
    return this.bankAccounts.get(id)
  }

  @Post()
  @RequirePermissions(FinancePermissions.bankAccountsWrite)
  create(@Body() dto: CreateBankAccountDto): Promise<BankAccountDto> {
    return this.bankAccounts.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(FinancePermissions.bankAccountsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
  ): Promise<BankAccountDto> {
    return this.bankAccounts.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(FinancePermissions.bankAccountsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.bankAccounts.remove(id)
  }
}
