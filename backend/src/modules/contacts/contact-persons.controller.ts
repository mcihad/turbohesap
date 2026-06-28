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
  type ContactPersonDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ContactPersonsService } from './contact-persons.service'
import {
  CreateContactPersonDto,
  UpdateContactPersonDto,
} from './dto/contact-person.dto'

@Controller('contacts/persons')
export class ContactPersonsController {
  constructor(private readonly persons: ContactPersonsService) {}

  @Get()
  @RequirePermissions(ContactsPermissions.contactsRead)
  list(@Query('contactId') contactId: string): Promise<ContactPersonDto[]> {
    return this.persons.list(contactId)
  }

  @Get(':id')
  @RequirePermissions(ContactsPermissions.contactsRead)
  get(@Param('id') id: string): Promise<ContactPersonDto> {
    return this.persons.get(id)
  }

  @Post()
  @RequirePermissions(ContactsPermissions.contactsWrite)
  create(@Body() dto: CreateContactPersonDto): Promise<ContactPersonDto> {
    return this.persons.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(ContactsPermissions.contactsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContactPersonDto,
  ): Promise<ContactPersonDto> {
    return this.persons.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ContactsPermissions.contactsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.persons.remove(id)
  }
}
