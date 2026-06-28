import { BadRequestException, Body, Controller, Get, Param, Put } from '@nestjs/common'

import { ContactsPermissions, type CrmFieldDefsDto } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CrmFieldsService } from './crm-fields.service'
import { SetCrmFieldDefsDto, isCrmFieldEntity } from './dto/crm-fields.dto'

@Controller('contacts/field-defs')
export class CrmFieldsController {
  constructor(private readonly fields: CrmFieldsService) {}

  @Get(':entity')
  @RequirePermissions(ContactsPermissions.contactsRead)
  get(@Param('entity') entity: string): Promise<CrmFieldDefsDto> {
    if (!isCrmFieldEntity(entity)) throw new BadRequestException('Geçersiz varlık')
    return this.fields.get(entity)
  }

  @Put(':entity')
  @RequirePermissions(ContactsPermissions.pipelinesWrite)
  set(@Param('entity') entity: string, @Body() dto: SetCrmFieldDefsDto): Promise<CrmFieldDefsDto> {
    if (!isCrmFieldEntity(entity)) throw new BadRequestException('Geçersiz varlık')
    return this.fields.set(entity, dto)
  }
}
