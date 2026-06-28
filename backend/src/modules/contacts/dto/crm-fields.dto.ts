import { IsArray, IsIn, IsString } from 'class-validator'

import {
  CRM_FIELD_ENTITIES,
  type BulkContactRequest,
  type BulkOpportunityRequest,
  type CrmFieldDef,
  type CrmFieldEntity,
  type ImportContactsRequest,
  type SetCrmFieldDefsRequest,
} from '@turbohesap/shared'

export class SetCrmFieldDefsDto implements SetCrmFieldDefsRequest {
  // Field defs are a free-form JSON array validated structurally by the UI builder.
  @IsArray() fields!: CrmFieldDef[]
}

export class BulkContactDto implements BulkContactRequest {
  @IsArray() @IsString({ each: true }) ids!: string[]
  @IsIn(['assignOwner', 'addTag', 'removeTag', 'setActive', 'setGroup'])
  op!: BulkContactRequest['op']
  @IsString() value!: string
}

export class BulkOpportunityDto implements BulkOpportunityRequest {
  @IsArray() @IsString({ each: true }) ids!: string[]
  @IsIn(['assignOwner', 'move']) op!: BulkOpportunityRequest['op']
  @IsString() value!: string
}

export class ImportContactsDto implements ImportContactsRequest {
  @IsArray() contacts!: ImportContactsRequest['contacts']
}

export function isCrmFieldEntity(v: string): v is CrmFieldEntity {
  return (CRM_FIELD_ENTITIES as string[]).includes(v)
}
