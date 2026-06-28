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
  ContactsPermissions,
  type ContactTransactionDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ContactTransactionsService } from './contact-transactions.service'
import {
  CreateContactTransactionDto,
  UpdateContactTransactionDto,
} from './dto/contact-transaction.dto'

@Controller('contacts/transactions')
export class ContactTransactionsController {
  constructor(private readonly transactions: ContactTransactionsService) {}

  @Get()
  @RequirePermissions(ContactsPermissions.transactionsRead)
  list(
    @Query('contactId') contactId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ContactTransactionDto[]> {
    return this.transactions.list({ contactId, from, to })
  }

  @Get(':id')
  @RequirePermissions(ContactsPermissions.transactionsRead)
  get(@Param('id') id: string): Promise<ContactTransactionDto> {
    return this.transactions.get(id)
  }

  @Post()
  @RequirePermissions(ContactsPermissions.transactionsWrite)
  create(@Body() dto: CreateContactTransactionDto): Promise<ContactTransactionDto> {
    return this.transactions.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(ContactsPermissions.transactionsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContactTransactionDto,
  ): Promise<ContactTransactionDto> {
    return this.transactions.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ContactsPermissions.transactionsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.transactions.remove(id)
  }
}
