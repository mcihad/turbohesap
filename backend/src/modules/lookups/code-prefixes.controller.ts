import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'

import { LookupsPermissions, type CodePrefixDto, type ConsumeCodeResponse, type PeekCodeResponse } from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CodePrefixesService } from './code-prefixes.service'
import { CreateCodePrefixDto } from './dto/create-code-prefix.dto'
import { UpdateCodePrefixDto } from './dto/update-code-prefix.dto'

// Auto-numbering counters for prefixed codes (stok kodu, vb.). `codePrefixesRead`
// covers list/get/peek/consume — generating a code is routine, not an admin
// action. `codePrefixesWrite` gates CRUD of the prefix definitions themselves.
@Controller('lookups/code-prefixes')
export class CodePrefixesController {
  constructor(private readonly prefixes: CodePrefixesService) {}

  // GET /api/lookups/code-prefixes?context=inventory.products
  @Get()
  @RequirePermissions(LookupsPermissions.codePrefixesRead)
  list(@Query('context') context?: string): Promise<CodePrefixDto[]> {
    return this.prefixes.list(context)
  }

  @Get(':id')
  @RequirePermissions(LookupsPermissions.codePrefixesRead)
  get(@Param('id') id: string): Promise<CodePrefixDto> {
    return this.prefixes.get(id)
  }

  @Get(':id/peek')
  @RequirePermissions(LookupsPermissions.codePrefixesRead)
  peek(@Param('id') id: string): Promise<PeekCodeResponse> {
    return this.prefixes.peek(id)
  }

  @Post(':id/consume')
  @RequirePermissions(LookupsPermissions.codePrefixesRead)
  consume(@Param('id') id: string): Promise<ConsumeCodeResponse> {
    return this.prefixes.consume(id)
  }

  @Post()
  @RequirePermissions(LookupsPermissions.codePrefixesWrite)
  create(@Body() dto: CreateCodePrefixDto): Promise<CodePrefixDto> {
    return this.prefixes.create(dto)
  }

  @Patch(':id')
  @RequirePermissions(LookupsPermissions.codePrefixesWrite)
  update(@Param('id') id: string, @Body() dto: UpdateCodePrefixDto): Promise<CodePrefixDto> {
    return this.prefixes.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(LookupsPermissions.codePrefixesWrite)
  async remove(@Param('id') id: string): Promise<void> {
    await this.prefixes.remove(id)
  }
}
