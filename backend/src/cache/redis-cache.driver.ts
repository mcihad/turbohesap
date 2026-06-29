import type { AppConfig } from '../config/configuration'
import type { CacheDriver } from './cache.driver'

// Redis-backed cache for multi-instance deployments. `ioredis` is an OPTIONAL
// dependency — it is required lazily here so the default memory store needs no
// redis package installed. JSON-encoded values; native EX/DEL for TTL.
export class RedisCacheDriver implements CacheDriver {
  readonly name = 'redis' as const
  private readonly client: {
    get(key: string): Promise<string | null>
    set(key: string, value: string, mode: string, ttl: number): Promise<unknown>
    del(key: string): Promise<unknown>
    quit(): Promise<unknown>
  }

  constructor(
    private readonly cfg: AppConfig['cache'],
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis')
    this.client = cfg.redis.url
      ? new Redis(cfg.redis.url)
      : new Redis({
          host: cfg.redis.host,
          port: cfg.redis.port,
          password: cfg.redis.password,
          db: cfg.redis.db,
          lazyConnect: false,
          maxRetriesPerRequest: 2,
        })
  }

  private k(key: string): string {
    return this.cfg.prefix + key
  }

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.client.get(this.k(key))
    if (raw == null) return undefined
    try {
      return JSON.parse(raw) as T
    } catch {
      return undefined
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.cfg.ttl
    await this.client.set(this.k(key), JSON.stringify(value), 'EX', ttl)
  }

  async del(key: string): Promise<void> {
    await this.client.del(this.k(key))
  }

  async wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(key)
    if (hit !== undefined) return hit
    const value = await fn()
    await this.set(key, value, ttlSeconds)
    return value
  }

  async onDestroy(): Promise<void> {
    try {
      await this.client.quit()
    } catch {
      /* ignore */
    }
  }
}
