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

import {
  ContactsPermissions,
  type ContactGroupDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ContactGroupsService } from './contact-groups.service'
import {
  CreateContactGroupDto,
  UpdateContactGroupDto,
} from './dto/contact-group.dto'

@Controller('contacts/groups')
export class ContactGroupsController {
  constructor(private readonly groups: ContactGroupsService) {}

  @Get()
  @RequirePermissions(ContactsPermissions.contactsRead)
  list(): Promise<ContactGroupDto[]> {
    return this.groups.list()
  }

  @Get(':id')
  @RequirePermissions(ContactsPermissions.contactsRead)
  get(@Param('id') id: string): Promise<ContactGroupDto> {
    return this.groups.get(id)
  }

  @Post()
  @RequirePermissions(ContactsPermissions.contactsWrite)
  create(@Body() dto: CreateContactGroupDto): Promise<ContactGroupDto> {
    return this.groups.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(ContactsPermissions.contactsWrite)
  update(@Param('id') id: string, @Body() dto: UpdateContactGroupDto): Promise<ContactGroupDto> {
    return this.groups.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ContactsPermissions.contactsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.groups.remove(id)
  }
}
