import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { UserSetting } from './entities/user-setting.entity'

// Per-user settings with a read-through / write-through cache (a Nest-managed
// in-memory store held by this singleton provider). Reads hit the cache first
// and fall back to the DB (populating the cache); writes update both. For
// multi-instance deploys swap this Map for a shared store (e.g. Redis) so cache
// stays coherent across nodes.
@Injectable()
export class SettingsService {
  private readonly cache = new Map<string, unknown>()

  constructor(
    @InjectRepository(UserSetting) private readonly repo: Repository<UserSetting>,
  ) {}

  private key(userId: string, type: string): string {
    return `${userId}::${type}`
  }

  async get(userId: string, type: string): Promise<unknown | null> {
    const k = this.key(userId, type)
    if (this.cache.has(k)) return this.cache.get(k) ?? null
    const row = await this.repo.findOne({ where: { userId, type } })
    const data = row ? row.data : null
    this.cache.set(k, data) // cache misses too — avoids repeat DB hits for absent settings
    return data
  }

  async set(userId: string, type: string, data: unknown): Promise<void> {
    let row = await this.repo.findOne({ where: { userId, type } })
    if (!row) row = this.repo.create({ userId, type, data })
    else row.data = data
    await this.repo.save(row)
    this.cache.set(this.key(userId, type), data)
  }

  async remove(userId: string, type: string): Promise<void> {
    await this.repo.delete({ userId, type })
    this.cache.delete(this.key(userId, type))
  }
}
