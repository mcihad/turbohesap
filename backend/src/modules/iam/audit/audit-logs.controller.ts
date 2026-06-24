import { Controller, Get, Param, Query } from '@nestjs/common'

import {
  type AuditLogDto,
  IamPermissions,
  type Page,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { AuditLogsService } from './audit-logs.service'
import { AuditLogQueryDto } from './dto/audit-log-query.dto'

// Read-only audit log API. Entries are written by the data layer (AuditSubscriber).
@Controller('iam/audit-logs')
export class AuditLogsController {
  constructor(private readonly audit: AuditLogsService) {}

  @Get()
  @RequirePermissions(IamPermissions.auditRead)
  list(@Query() query: AuditLogQueryDto): Promise<Page<AuditLogDto>> {
    return this.audit.list(query)
  }

  @Get('entity/:entityType/:entityId')
  @RequirePermissions(IamPermissions.auditRead)
  forEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<AuditLogDto[]> {
    return this.audit.forEntity(entityType, entityId)
  }

  @Get(':id')
  @RequirePermissions(IamPermissions.auditRead)
  get(@Param('id') id: string): Promise<AuditLogDto> {
    return this.audit.get(id)
  }
}
