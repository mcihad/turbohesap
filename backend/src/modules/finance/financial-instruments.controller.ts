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

import {
  FinancePermissions,
  type FinancialInstrumentDto,
  type InstrumentDirection,
  type InstrumentListQuery,
  type InstrumentStatus,
  type InstrumentType,
} from '@turbohesap/shared'

import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CreateFinancialInstrumentDto } from './dto/create-financial-instrument.dto'
import { SettleInstrumentDto } from './dto/settle-instrument.dto'
import { UpdateFinancialInstrumentDto } from './dto/update-financial-instrument.dto'
import { FinancialInstrumentsService } from './financial-instruments.service'

@Controller('finance/instruments')
export class FinancialInstrumentsController {
  constructor(private readonly instruments: FinancialInstrumentsService) {}

  @Get()
  @RequirePermissions(FinancePermissions.instrumentsRead)
  list(
    @Query('direction') direction?: InstrumentDirection,
    @Query('instrumentType') instrumentType?: InstrumentType,
    @Query('status') status?: InstrumentStatus,
    @Query('contactId') contactId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ): Promise<FinancialInstrumentDto[]> {
    const query: InstrumentListQuery = { direction, instrumentType, status, contactId, from, to, search }
    return this.instruments.list(query)
  }

  @Get(':id')
  @RequirePermissions(FinancePermissions.instrumentsRead)
  get(@Param('id') id: string): Promise<FinancialInstrumentDto> {
    return this.instruments.get(id)
  }

  @Post()
  @RequirePermissions(FinancePermissions.instrumentsWrite)
  create(
    @Body() dto: CreateFinancialInstrumentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FinancialInstrumentDto> {
    return this.instruments.create(dto, user.sub)
  }

  @Patch(':id')
  @RequirePermissions(FinancePermissions.instrumentsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFinancialInstrumentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FinancialInstrumentDto> {
    return this.instruments.update(id, dto, user.sub)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(FinancePermissions.instrumentsDelete)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.instruments.remove(id, user.sub)
  }

  @Post(':id/deposit-for-collection')
  @RequirePermissions(FinancePermissions.instrumentsStatus)
  depositForCollection(@Param('id') id: string): Promise<FinancialInstrumentDto> {
    return this.instruments.depositForCollection(id)
  }

  @Post(':id/collect')
  @RequirePermissions(FinancePermissions.instrumentsSettle)
  collect(
    @Param('id') id: string,
    @Body() dto: SettleInstrumentDto,
  ): Promise<FinancialInstrumentDto> {
    return this.instruments.collect(id, dto)
  }

  @Post(':id/pay')
  @RequirePermissions(FinancePermissions.instrumentsSettle)
  pay(
    @Param('id') id: string,
    @Body() dto: SettleInstrumentDto,
  ): Promise<FinancialInstrumentDto> {
    return this.instruments.pay(id, dto)
  }

  @Post(':id/reverse')
  @RequirePermissions(FinancePermissions.instrumentsSettle)
  reverse(@Param('id') id: string): Promise<FinancialInstrumentDto> {
    return this.instruments.reverse(id)
  }

  @Post(':id/bounce')
  @RequirePermissions(FinancePermissions.instrumentsStatus)
  bounce(@Param('id') id: string): Promise<FinancialInstrumentDto> {
    return this.instruments.bounce(id)
  }

  @Post(':id/endorse')
  @RequirePermissions(FinancePermissions.instrumentsStatus)
  endorse(@Param('id') id: string): Promise<FinancialInstrumentDto> {
    return this.instruments.endorse(id)
  }

  @Post(':id/pledge')
  @RequirePermissions(FinancePermissions.instrumentsStatus)
  pledge(@Param('id') id: string): Promise<FinancialInstrumentDto> {
    return this.instruments.pledge(id)
  }

  @Post(':id/cancel')
  @RequirePermissions(FinancePermissions.instrumentsStatus)
  cancel(@Param('id') id: string): Promise<FinancialInstrumentDto> {
    return this.instruments.cancel(id)
  }
}
