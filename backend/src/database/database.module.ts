import { join } from 'node:path'

import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

import { configuration } from '../config/configuration'

// DatabaseModule wires TypeORM to PostgreSQL. Entities are auto-loaded from the
// feature modules. The schema is owned by migrations (no synchronize); pending
// migrations run on boot when DB_MIGRATIONS_RUN is on. The standalone CLI
// DataSource lives in ../data-source.ts (used by `make migrate` / the scripts).
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
          synchronize: false,
          // snake_case DB identifiers; must match src/data-source.ts (CLI).
          namingStrategy: new SnakeNamingStrategy(),
          // Resolves to dist/migrations/*.js at runtime (this file is
          // dist/database/database.module.js) and src/migrations/*.ts under
          // ts-node.
          migrations: [join(__dirname, '..', 'migrations', '*.{js,ts}')],
          migrationsRun: cfg.database.migrationsRun,
        }
      },
    }),
  ],
})
export class DatabaseModule {}
