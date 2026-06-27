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

import { FinancePermissions, type CashAccountDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateCashAccountDto, UpdateCashAccountDto } from './dto/cash-account.dto'
import { CashAccountsService } from './cash-accounts.service'

@Controller('finance/cash-accounts')
export class CashAccountsController {
  constructor(private readonly cashAccounts: CashAccountsService) {}

  @Get()
  @RequirePermissions(FinancePermissions.cashAccountsRead)
  list(): Promise<CashAccountDto[]> {
    return this.cashAccounts.list()
  }

  @Get(':id')
  @RequirePermissions(FinancePermissions.cashAccountsRead)
  get(@Param('id') id: string): Promise<CashAccountDto> {
    return this.cashAccounts.get(id)
  }

  @Post()
  @RequirePermissions(FinancePermissions.cashAccountsWrite)
  create(@Body() dto: CreateCashAccountDto): Promise<CashAccountDto> {
    return this.cashAccounts.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(FinancePermissions.cashAccountsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCashAccountDto,
  ): Promise<CashAccountDto> {
    return this.cashAccounts.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(FinancePermissions.cashAccountsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.cashAccounts.remove(id)
  }
}
