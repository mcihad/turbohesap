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

import { ContactsPermissions, type ContactAddressDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ContactAddressesService } from './contact-addresses.service'
import {
  CreateContactAddressDto,
  UpdateContactAddressDto,
} from './dto/contact-address.dto'

@Controller('contacts/addresses')
export class ContactAddressesController {
  constructor(private readonly addresses: ContactAddressesService) {}

  @Get()
  @RequirePermissions(ContactsPermissions.contactsRead)
  list(@Query('contactId') contactId: string): Promise<ContactAddressDto[]> {
    return this.addresses.list(contactId)
  }

  @Get(':id')
  @RequirePermissions(ContactsPermissions.contactsRead)
  get(@Param('id') id: string): Promise<ContactAddressDto> {
    return this.addresses.get(id)
  }

  @Post()
  @RequirePermissions(ContactsPermissions.contactsWrite)
  create(@Body() dto: CreateContactAddressDto): Promise<ContactAddressDto> {
    return this.addresses.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(ContactsPermissions.contactsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContactAddressDto,
  ): Promise<ContactAddressDto> {
    return this.addresses.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(ContactsPermissions.contactsWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.addresses.remove(id)
  }
}
