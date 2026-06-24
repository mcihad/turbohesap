import {
  Controller,
  Get,
  InternalServerErrorException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'

// DEV/TEST helper: endpoints that produce **genuine** runtime errors (not
// fabricated), so the global error-capture pipeline (req 2 — AllExceptionsFilter
// → ErrorLog) can be exercised from the UI. Authenticated (global JwtAuthGuard);
// no business value — safe to delete.
@Controller('debug')
export class DebugController {
  constructor(private readonly dataSource: DataSource) {}

  // Real TypeError: dereferencing undefined.
  @Get('error/runtime')
  runtimeError(): string {
    const value = undefined as unknown as { name: string }
    return value.name
  }

  // Real HttpException (500).
  @Get('error/http')
  httpError(): never {
    throw new InternalServerErrorException('Sunucu işlemi tamamlanamadı')
  }

  // Real database error: invalid uuid syntax raised by PostgreSQL.
  @Get('error/db')
  async dbError(): Promise<string> {
    await this.dataSource.query(
      "SELECT * FROM users WHERE id = 'not-a-valid-uuid'",
    )
    return 'ok'
  }
}
