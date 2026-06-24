// Runtime configuration resolved from environment variables (loaded from .env by
// ConfigModule). Covers the HTTP server, PostgreSQL, JWT lifetimes/secrets, and
// the seed admin account.

export interface AppConfig {
  host: string
  port: number
  env: string
  staticCacheMaxAge: number
  database: {
    url: string
    synchronize: boolean
  }
  jwt: {
    accessSecret: string
    accessTtl: string
    refreshSecret: string
    refreshTtl: string
  }
  seed: {
    adminUsername: string
    adminPassword: string
    adminEmail: string
  }
}

function int(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && value ? n : fallback
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true' || value === '1'
}

export function configuration(): AppConfig {
  return {
    host: process.env.HOST || '0.0.0.0',
    port: int(process.env.PORT, 5800),
    env: process.env.APP_ENV || 'development',
    staticCacheMaxAge: int(process.env.STATIC_CACHE_MAX_AGE, 3600),
    database: {
      url:
        process.env.DATABASE_URL ||
        'postgres://postgres:postgres@localhost:5432/turbohesap',
      // In dev TypeORM creates/updates tables automatically; turn off for prod
      // and use migrations instead.
      synchronize: bool(
        process.env.DB_SYNCHRONIZE,
        (process.env.APP_ENV || 'development') !== 'production',
      ),
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
      accessTtl: process.env.JWT_ACCESS_TTL || '15m',
      refreshSecret:
        process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
      refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    },
    seed: {
      adminUsername: process.env.SEED_ADMIN_USERNAME || 'admin',
      adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
      adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@turbohesap.local',
    },
  }
}
