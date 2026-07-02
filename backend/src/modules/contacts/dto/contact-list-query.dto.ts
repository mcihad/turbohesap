import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

import type { ContactListQuery, ContactRole } from '@turbohesap/shared'

import { ListQueryDto } from '../../../common/list/list-query.dto'

const toBool = ({ value }: { value: unknown }) => value === true || value === 'true'

export class ContactListQueryDto extends ListQueryDto implements ContactListQuery {
  @IsOptional() @IsString() role?: ContactRole

  @IsOptional() @IsString() groupId?: string

  @IsOptional() @IsString() ownerId?: string

  @IsOptional() @Transform(toBool) @IsBoolean() mine?: boolean

  @IsOptional() @IsString() tag?: string

  @IsOptional() @Transform(toBool) @IsBoolean() activeOnly?: boolean
}
