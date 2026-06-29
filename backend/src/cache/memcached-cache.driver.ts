import type { AppConfig } from '../config/configuration'
import type { CacheDriver } from './cache.driver'

// Memcached-backed cache. `memjs` is an OPTIONAL dependency, required lazily so
// the default memory store needs no memcached package installed. JSON-encoded
// values; native expires/delete for TTL.
export class MemcachedCacheDriver implements CacheDriver {
  readonly name = 'memcached' as const
  private readonly client: {
    get(key: string): Promise<{ value: Buffer | null }>
    set(key: string, value: string, opts: { expires: number }): Promise<boolean>
    delete(key: string): Promise<boolean>
    quit(): void
  }

  constructor(private readonly cfg: AppConfig['cache']) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const memjs = require('memjs')
    this.client = memjs.Client.create(cfg.memcached.servers, {
      username: cfg.memcached.username,
      password: cfg.memcached.password,
    })
  }

  private k(key: string): string {
    // memcached keys can't contain spaces/control chars; prefix is safe.
    return this.cfg.prefix + key
  }

  async get<T>(key: string): Promise<T | undefined> {
    const { value } = await this.client.get(this.k(key))
    if (value == null) return undefined
    try {
      return JSON.parse(value.toString()) as T
    } catch {
      return undefined
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.cfg.ttl
    await this.client.set(this.k(key), JSON.stringify(value), { expires: ttl })
  }

  async del(key: string): Promise<void> {
    await this.client.delete(this.k(key))
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
      this.client.quit()
    } catch {
      /* ignore */
    }
  }
}
