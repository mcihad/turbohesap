import { Controller, Get, HttpException, HttpStatus, Optional } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

import type { HealthStatus } from '@kentos/shared'

// HealthController reports liveness, and database connectivity when a database
// is configured (DataSource is optional — absent when DATABASE_URL is unset).
@Controller('health')
export class HealthController {
  constructor(
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  @Get()
  async health(): Promise<HealthStatus> {
    if (!this.dataSource) {
      return { status: 'ok' }
    }
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
