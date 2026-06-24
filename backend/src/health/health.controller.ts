import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

import type { HealthStatus } from '@turbohesap/shared'

import { Public } from '../common/decorators/public.decorator'

// Liveness + database connectivity. Public (no auth required).
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async health(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1')
      return { status: 'ok', database: 'up' }
    } catch {
      throw new HttpException(
        { status: 'degraded', database: 'down' } satisfies HealthStatus,
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }
  }
}
