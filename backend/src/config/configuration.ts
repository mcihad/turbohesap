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
    migrationsRun: boolean
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
  /** Allowed CORS origins (CORS_ORIGINS, comma-separated). Empty → see main.ts. */
  corsOrigins: string[]
  /** Global rate-limit window (ms) + max requests per window. */
  throttle: {
    ttl: number
    limit: number
  }
  /** File storage — local directory or S3 (selected by FILE_STORAGE). */
  files: {
    driver: 'local' | 's3'
    /** Directory for local storage (relative to backend cwd, or absolute). */
    localDir: string
    /** Max upload size per file, in megabytes. */
    maxSizeMb: number
    s3: {
      bucket: string
      region: string
      accessKeyId: string
      secretAccessKey: string
      /** Custom endpoint for S3-compatible stores (MinIO, R2…); empty for AWS. */
      endpoint?: string
      forcePathStyle: boolean
    }
  }
}

const DEFAULT_ACCESS_SECRET = 'dev-access-secret-change-me'
const DEFAULT_REFRESH_SECRET = 'dev-refresh-secret-change-me'

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
      // Schema is owned by migrations (no synchronize). Pending migrations run
      // automatically on boot unless disabled (e.g. multi-instance deploys that
      // run them out-of-band).
      migrationsRun: bool(process.env.DB_MIGRATIONS_RUN, true),
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET || DEFAULT_ACCESS_SECRET,
      accessTtl: process.env.JWT_ACCESS_TTL || '15m',
      refreshSecret: process.env.JWT_REFRESH_SECRET || DEFAULT_REFRESH_SECRET,
      refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    },
    seed: {
      adminUsername: process.env.SEED_ADMIN_USERNAME || 'admin',
      adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
      adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@turbohesap.local',
    },
    corsOrigins: (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    throttle: {
      ttl: int(process.env.THROTTLE_TTL, 60_000),
      limit: int(process.env.THROTTLE_LIMIT, 300),
    },
    files: {
      driver: process.env.FILE_STORAGE === 's3' ? 's3' : 'local',
      localDir: process.env.FILE_LOCAL_DIR || 'storage/uploads',
      maxSizeMb: int(process.env.FILE_MAX_SIZE_MB, 25),
      s3: {
        bucket: process.env.S3_BUCKET || '',
        region: process.env.S3_REGION || 'us-east-1',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE, false),
      },
    },
  }
}

/**
 * Fail fast on dangerous production misconfiguration: refuse to boot in
 * production while JWT secrets are still the dev placeholders.
 */
export function assertProductionConfig(cfg: AppConfig): void {
  if (cfg.env !== 'production') return
  const problems: string[] = []
  if (cfg.jwt.accessSecret === DEFAULT_ACCESS_SECRET)
    problems.push('JWT_ACCESS_SECRET')
  if (cfg.jwt.refreshSecret === DEFAULT_REFRESH_SECRET)
    problems.push('JWT_REFRESH_SECRET')
  if (cfg.seed.adminPassword === 'Admin123!')
    problems.push('SEED_ADMIN_PASSWORD')
  if (problems.length > 0) {
    throw new Error(
      `Refusing to start in production with default secrets: ${problems.join(', ')}. Set them in the environment.`,
    )
  }
}
