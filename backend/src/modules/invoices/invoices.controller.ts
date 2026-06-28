import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'

import {
  InvoicesPermissions,
  type CreateInvoicePaymentRequest,
  type InvoiceDto,
  type InvoiceListQuery,
  type InvoicePaymentDto,
  type InvoiceStatus,
  type InvoiceType,
} from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { InvoicesService } from './invoices.service'
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto'
import { CreateInvoicePaymentDto } from './dto/invoice-payment.dto'

@Controller('invoices/invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @RequirePermissions(InvoicesPermissions.read)
  list(
    @Query('type') type?: InvoiceType,
    @Query('status') status?: InvoiceStatus,
    @Query('contactId') contactId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ): Promise<InvoiceDto[]> {
    const query: InvoiceListQuery = { type, status, contactId, from, to, search }
    return this.invoices.list(query)
  }

  @Get(':id')
  @RequirePermissions(InvoicesPermissions.read)
  get(@Param('id') id: string): Promise<InvoiceDto> {
    return this.invoices.get(id)
  }

  @Get(':id/xml')
  @RequirePermissions(InvoicesPermissions.read)
  @Header('Content-Type', 'application/xml; charset=utf-8')
  xml(@Param('id') id: string): Promise<string> {
    return this.invoices.getXml(id)
  }

  @Post()
  @RequirePermissions(InvoicesPermissions.write)
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser): Promise<InvoiceDto> {
    return this.invoices.create(dto, user.sub)
  }

  @Patch(':id')
  @RequirePermissions(InvoicesPermissions.write)
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto): Promise<InvoiceDto> {
    return this.invoices.update(id, dto)
  }

  @Post(':id/issue')
  @RequirePermissions(InvoicesPermissions.write)
  issue(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<InvoiceDto> {
    return this.invoices.issue(id, user.sub)
  }

  @Post(':id/cancel')
  @RequirePermissions(InvoicesPermissions.write)
  cancel(@Param('id') id: string): Promise<InvoiceDto> {
    return this.invoices.cancel(id)
  }

  @Get(':id/payments')
  @RequirePermissions(InvoicesPermissions.read)
  payments(@Param('id') id: string): Promise<InvoicePaymentDto[]> {
    return this.invoices.listPayments(id)
  }

  @Post(':id/payments')
  @RequirePermissions(InvoicesPermissions.write)
  addPayment(@Param('id') id: string, @Body() dto: CreateInvoicePaymentDto): Promise<InvoiceDto> {
    return this.invoices.addPayment(id, dto as CreateInvoicePaymentRequest)
  }

  @Delete('payments/:paymentId')
  @HttpCode(204)
  @RequirePermissions(InvoicesPermissions.write)
  async removePayment(@Param('paymentId') paymentId: string): Promise<void> {
    await this.invoices.removePayment(paymentId)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(InvoicesPermissions.write)
  async remove(@Param('id') id: string): Promise<void> {
    await this.invoices.remove(id)
  }
}
