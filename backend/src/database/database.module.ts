import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { configuration } from '../config/configuration'

// DatabaseModule wires TypeORM to PostgreSQL. Entities are auto-loaded from the
// feature modules; in development the schema is synchronized automatically
// (DB_SYNCHRONIZE), in production use migrations.
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const cfg = configuration()
        return {
          type: 'postgres',
          url: cfg.database.url,
          autoLoadEntities: true,
          synchronize: cfg.database.synchronize,
        }
      },
    }),
  ],
})
export class DatabaseModule {}
