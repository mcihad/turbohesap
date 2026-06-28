import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'

import { FinancePermissions, type FinanceTransactionDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateFinanceTransactionDto, UpdateFinanceTransactionDto } from './dto/finance-transaction.dto'
import { FinanceTransactionsService } from './finance-transactions.service'

@Controller('finance/transactions')
export class FinanceTransactionsController {
  constructor(private readonly transactions: FinanceTransactionsService) {}

  @Get()
  @RequirePermissions(FinancePermissions.transactionsRead)
  list(
    @Query('cashAccountId') cashAccountId?: string,
    @Query('bankAccountId') bankAccountId?: string,
  ): Promise<FinanceTransactionDto[]> {
    return this.transactions.list({ cashAccountId, bankAccountId })
  }

  @Get(':id')
  @RequirePermissions(FinancePermissions.transactionsRead)
  get(@Param('id') id: string): Promise<FinanceTransactionDto> {
    return this.transactions.get(id)
  }

  @Post()
  @RequirePermissions(FinancePermissions.transactionsWrite)
  create(@Body() dto: CreateFinanceTransactionDto): Promise<FinanceTransactionDto> {
    return this.transactions.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(FinancePermissions.transactionsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceTransactionDto,
  ): Promise<FinanceTransactionDto> {
    return this.transactions.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(FinancePermissions.transactionsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.transactions.remove(id)
  }
}
