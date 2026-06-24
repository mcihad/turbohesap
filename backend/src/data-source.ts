import 'reflect-metadata'
import { join } from 'node:path'

import { DataSource } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

// Standalone TypeORM DataSource for the migration CLI (typeorm-ts-node-commonjs).
// The NestJS runtime uses its own config (src/database/database.module.ts) with
// autoLoadEntities; this file mirrors the connection + globs so the CLI can
// generate/run/revert migrations. Run via `make migrate` / the package scripts,
// which export the root .env (so DATABASE_URL is set).
const url =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/turbohesap'

export default new DataSource({
  type: 'postgres',
  url,
  // snake_case column/join-column names (camelCase TS props → snake_case DB).
  // MUST match database.module.ts so generated migrations stay consistent.
  namingStrategy: new SnakeNamingStrategy(),
  // Globs resolve to .ts under ts-node (CLI) and .js under dist (compiled).
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
})
