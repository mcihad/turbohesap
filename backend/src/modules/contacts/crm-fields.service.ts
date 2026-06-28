import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type { CrmFieldDefsDto, CrmFieldEntity } from '@turbohesap/shared'

import { CrmFieldDefEntity } from './entities/crm-field-def.entity'
import type { SetCrmFieldDefsDto } from './dto/crm-fields.dto'

@Injectable()
export class CrmFieldsService {
  constructor(
    @InjectRepository(CrmFieldDefEntity)
    private readonly defs: Repository<CrmFieldDefEntity>,
  ) {}

  async get(entity: CrmFieldEntity): Promise<CrmFieldDefsDto> {
    const row = await this.defs.findOne({ where: { entity } })
    return { entity, fields: row?.fields ?? [] }
  }

  async set(entity: CrmFieldEntity, dto: SetCrmFieldDefsDto): Promise<CrmFieldDefsDto> {
    let row = await this.defs.findOne({ where: { entity } })
    if (!row) row = this.defs.create({ entity, fields: [] })
    row.fields = dto.fields ?? []
    await this.defs.save(row)
    return { entity, fields: row.fields }
  }
}
