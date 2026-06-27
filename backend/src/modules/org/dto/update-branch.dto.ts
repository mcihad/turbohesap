import { PartialType } from '@nestjs/swagger'

import type { UpdateBranchRequest } from '@turbohesap/shared'

import { CreateBranchDto } from './create-branch.dto'

// All fields optional for PATCH (code/name lose their @IsNotEmpty requirement).
export class UpdateBranchDto
  extends PartialType(CreateBranchDto)
  implements UpdateBranchRequest {}
