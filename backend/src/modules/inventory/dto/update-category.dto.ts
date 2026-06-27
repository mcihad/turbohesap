import { PartialType } from '@nestjs/swagger'

import type { UpdateCategoryRequest } from '@turbohesap/shared'

import { CreateCategoryDto } from './create-category.dto'

export class UpdateCategoryDto
  extends PartialType(CreateCategoryDto)
  implements UpdateCategoryRequest {}
