// Pluggable cache abstraction. The active driver (memory / redis / memcached) is
// chosen from config at startup — mirroring the files StorageDriver pattern.
// Analytics services read through `wrap()` so an expensive aggregation runs at
// most once per TTL window.

export interface CacheDriver {
  readonly name: 'memory' | 'redis' | 'memcached'
  /** Returns the cached value, or undefined on miss. */
  get<T>(key: string): Promise<T | undefined>
  /** Stores a value with a TTL in seconds (defaults to the configured TTL). */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  /** Deletes a single key. */
  del(key: string): Promise<void>
  /**
   * Returns the cached value for `key`, or computes it via `fn`, stores it for
   * `ttlSeconds`, and returns it. Concurrent callers may compute once each
   * (no thundering-herd lock) — acceptable for read-only analytics.
   */
  wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T>
  /** Optional teardown (close redis/memcached connections). */
  onDestroy?(): Promise<void>
}

export const CACHE_DRIVER = Symbol('CACHE_DRIVER')
