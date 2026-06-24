import { type DynamicModule, Logger, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { configuration } from '../config/configuration'

// DatabaseModule registers TypeORM only when DATABASE_URL is set. The server
// still boots (and serves the frontend) without a database — matching the Go
// backend, which keeps `make run` working out of the box.
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const cfg = configuration()
    if (!cfg.databaseUrl) {
      Logger.warn('DATABASE_URL not set; starting without a database', 'Database')
      return { module: DatabaseModule }
    }

    Logger.log('connecting to database', 'Database')
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: cfg.databaseUrl,
          autoLoadEntities: true,
          // Migrations own the schema; never auto-sync in this template.
          synchronize: false,
        }),
      ],
    }
  }
}
