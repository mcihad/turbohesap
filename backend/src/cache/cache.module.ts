import { Global, Module, type OnApplicationShutdown } from '@nestjs/common'
import { Inject } from '@nestjs/common'

import { configuration } from '../config/configuration'
import { CACHE_DRIVER, type CacheDriver } from './cache.driver'
import { MemoryCacheDriver } from './memory-cache.driver'
import { RedisCacheDriver } from './redis-cache.driver'
import { MemcachedCacheDriver } from './memcached-cache.driver'

// Global cache module — exposes a single CacheDriver chosen from config at
// startup (memory by default; redis/memcached when CACHE_STORE is set). Mirrors
// the files StorageDriver useFactory pattern. @Global so any module can inject
// CACHE_DRIVER without importing CacheModule.
@Global()
@Module({
  providers: [
    {
      provide: CACHE_DRIVER,
      useFactory: (): CacheDriver => {
        const c = configuration().cache
        if (c.store === 'redis') return new RedisCacheDriver(c)
        if (c.store === 'memcached') return new MemcachedCacheDriver(c)
        return new MemoryCacheDriver(c.prefix, c.ttl, c.memoryMax)
      },
    },
  ],
  exports: [CACHE_DRIVER],
})
export class CacheModule implements OnApplicationShutdown {
  constructor(@Inject(CACHE_DRIVER) private readonly driver: CacheDriver) {}

  async onApplicationShutdown(): Promise<void> {
    await this.driver.onDestroy?.()
  }
}
