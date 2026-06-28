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
  type ContactListQuery,
  type ContactRole,
} from '@turbohesap/shared'

import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ContactsService } from './contacts.service'
import { ConvertLeadDto, CreateContactDto, UpdateContactDto } from './dto/contact.dto'
import { BulkContactDto, ImportContactsDto } from './dto/crm-fields.dto'
import type { BulkResultDto, ImportResultDto } from '@turbohesap/shared'

@Controller('contacts/contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @RequirePermissions(ContactsPermissions.contactsRead)
  list(
    @CurrentUser() user: AuthUser,
    @Query('role') role?: ContactRole,
    @Query('groupId') groupId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('mine') mine?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<ContactDto[]> {
    const query: ContactListQuery = {
      role,
      groupId,
      ownerId,
      mine: mine === 'true',
      tag,
      search,
      activeOnly: activeOnly === 'true',
    }
    return this.contacts.list(query, user.sub)
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
