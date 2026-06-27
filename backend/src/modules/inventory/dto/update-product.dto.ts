import { PartialType } from '@nestjs/swagger'

import type { UpdateProductRequest } from '@turbohesap/shared'

import { CreateProductDto } from './create-product.dto'

export class UpdateProductDto
  extends PartialType(CreateProductDto)
  implements UpdateProductRequest {}
