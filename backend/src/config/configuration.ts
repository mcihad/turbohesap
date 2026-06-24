// Runtime configuration resolved from environment variables (loaded from .env
// by ConfigModule). Mirrors the Go backend's config so behaviour is identical.

export interface AppConfig {
  host: string
  port: number
  env: string
  databaseUrl: string
  staticCacheMaxAge: number
  keycloak: {
    url: string
    realm: string
    clientSecret: string
    redirectUri: string
  }
}

function int(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && value ? n : fallback
}

export function configuration(): AppConfig {
  return {
    host: process.env.HOST || '0.0.0.0',
    port: int(process.env.PORT, 5800),
    env: process.env.APP_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    staticCacheMaxAge: int(process.env.STATIC_CACHE_MAX_AGE, 3600),
    keycloak: {
      url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
      realm: process.env.KEYCLOAK_REALM || 'sivasbeltr',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
      redirectUri: process.env.KEYCLOAK_REDIRECT_URI || '',
    },
  }
}

/** Keycloak realm issuer URL. */
export function issuerOf(cfg: AppConfig): string {
  return `${cfg.keycloak.url}/realms/${cfg.keycloak.realm}`
}
