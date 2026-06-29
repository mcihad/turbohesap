import type { CacheDriver } from './cache.driver'

interface Entry {
  value: unknown
  expiresAt: number
}

// Default in-process cache: a Map with per-entry expiry and a simple size cap
// (oldest-inserted evicted first). No external dependency — works out of the box.
// Per-instance only; use redis/memcached for multi-instance deployments.
export class MemoryCacheDriver implements CacheDriver {
  readonly name = 'memory' as const
  private readonly store = new Map<string, Entry>()

  constructor(
    private readonly prefix: string,
    private readonly defaultTtl: number,
    private readonly max: number,
  ) {}

  private k(key: string): string {
    return this.prefix + key
  }

  async get<T>(key: string): Promise<T | undefined> {
    const e = this.store.get(this.k(key))
    if (!e) return undefined
    if (e.expiresAt <= Date.now()) {
      this.store.delete(this.k(key))
      return undefined
    }
    return e.value as T
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = (ttlSeconds ?? this.defaultTtl) * 1000
    // Evict the oldest entry when at capacity (Map preserves insertion order).
    if (this.store.size >= this.max) {
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    this.store.set(this.k(key), { value, expiresAt: Date.now() + ttl })
  }

  async del(key: string): Promise<void> {
    this.store.delete(this.k(key))
  }

  async wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(key)
    if (hit !== undefined) return hit
    const value = await fn()
    await this.set(key, value, ttlSeconds)
    return value
  }
}
