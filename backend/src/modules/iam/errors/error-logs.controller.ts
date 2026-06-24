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
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import { Throttle } from '@nestjs/throttler'

import {
  type ErrorLogDto,
  IamPermissions,
  type Page,
} from '@turbohesap/shared'

import { Public } from '../../../common/decorators/public.decorator'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { ErrorLogQueryDto } from './dto/error-log-query.dto'
import { ReportClientErrorDto } from './dto/report-client-error.dto'
import { UpdateErrorLogDto } from './dto/update-error-log.dto'
import { ErrorLogsService } from './error-logs.service'

@Controller('iam/error-logs')
export class ErrorLogsController {
  constructor(private readonly errors: ErrorLogsService) {}

  @Get()
  @RequirePermissions(IamPermissions.errorsRead)
  list(@Query() query: ErrorLogQueryDto): Promise<Page<ErrorLogDto>> {
    return this.errors.list(query)
  }

  @Get(':id')
  @RequirePermissions(IamPermissions.errorsRead)
  get(@Param('id') id: string): Promise<ErrorLogDto> {
    return this.errors.get(id)
  }

  @Patch(':id')
  @RequirePermissions(IamPermissions.errorsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateErrorLogDto,
  ): Promise<ErrorLogDto> {
    return this.errors.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(IamPermissions.errorsDelete)
  async remove(@Param('id') id: string): Promise<void> {
    await this.errors.remove(id)
  }

  // Public: clients may hit an error while signed out, and we still want it.
  // Rate-limited to curb abuse of the open endpoint.
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('client')
  @Public()
  @HttpCode(204)
  async report(
    @Body() dto: ReportClientErrorDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.errors.capture({
      origin: 'client',
      message: dto.message,
      exceptionType: dto.exceptionType ?? 'ClientError',
      stackTrace: dto.stackTrace ?? null,
      source: dto.source ?? null,
      fileName: dto.fileName ?? null,
      lineNumber: dto.lineNumber ?? null,
      path: dto.path ?? null,
      module: dto.module ?? null,
      statusCode: 0,
      ipAddress: req.ip ?? null,
      userAgent: dto.userAgent ?? req.headers['user-agent'] ?? null,
    })
  }
}
