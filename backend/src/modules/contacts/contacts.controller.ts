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
  type ContactDto,
  type Page,
} from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ContactsService } from './contacts.service'
import { ConvertLeadDto, CreateContactDto, UpdateContactDto } from './dto/contact.dto'
import { ContactListQueryDto } from './dto/contact-list-query.dto'
import { BulkContactDto, ImportContactsDto } from './dto/crm-fields.dto'
import type { BulkResultDto, ImportResultDto } from '@turbohesap/shared'

@Controller('contacts/contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @RequirePermissions(ContactsPermissions.contactsRead)
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ContactListQueryDto,
  ): Promise<ContactDto[]> {
    return this.contacts.list(query, user.sub)
  }

  // Server-paginated variant for the DataGrid. Declared before `:id` so the
  // static path is not captured as a contact id.
  @Get('paged')
  @RequirePermissions(ContactsPermissions.contactsRead)
  listPage(
    @CurrentUser() user: AuthUser,
    @Query() query: ContactListQueryDto,
  ): Promise<Page<ContactDto>> {
    return this.contacts.listPage(query, user.sub)
  }

  @Get(':id')
  @RequirePermissions(ContactsPermissions.contactsRead)
  get(@Param('id') id: string): Promise<ContactDto> {
    return this.contacts.get(id)
  }

  @Post()
  @RequirePermissions(ContactsPermissions.contactsWrite)
  create(@Body() dto: CreateContactDto): Promise<ContactDto> {
    return this.contacts.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(ContactsPermissions.contactsWrite)
  update(@Param('id') id: string, @Body() dto: UpdateContactDto): Promise<ContactDto> {
    return this.contacts.update(id, dto)
  }

  @Post(':id/convert')
  @RequirePermissions(ContactsPermissions.contactsWrite)
  convert(
    @Param('id') id: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ContactDto> {
    return this.contacts.convert(id, dto, user.sub)
  }

  @Post('bulk')
  @RequirePermissions(ContactsPermissions.contactsWrite)
  bulk(@Body() dto: BulkContactDto): Promise<BulkResultDto> {
    return this.contacts.bulk(dto)
  }

  @Post('import')
  @RequirePermissions(ContactsPermissions.contactsWrite)
  importContacts(@Body() dto: ImportContactsDto): Promise<ImportResultDto> {
    return this.contacts.importContacts(dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ContactsPermissions.contactsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.contacts.remove(id)
  }
}
