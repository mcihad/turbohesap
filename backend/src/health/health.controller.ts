import { Controller, Get, HttpStatus, Res } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import type { Response } from 'express'
import { DataSource } from 'typeorm'

import type { HealthStatus } from '@turbohesap/shared'

import { Public } from '../common/decorators/public.decorator'

// Liveness + database connectivity. Public (no auth required). Returns the
// HealthStatus body directly; on a DB failure it sets 503 via the response
// (not a thrown exception) so the body keeps the HealthStatus shape rather than
// being reshaped by the global ApiError filter.
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async health(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1')
      return { status: 'ok', database: 'up' }
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE)
      return { status: 'degraded', database: 'down' }
    }
  }
}
