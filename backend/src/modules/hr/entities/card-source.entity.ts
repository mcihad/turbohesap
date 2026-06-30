import { Column, Entity } from 'typeorm'

import type { AccessDirection } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Kartlı geçiş kaynağı (card-access device/system). `apiKey` is for a future
// public HTTP ingest server — masked on read, never serialized raw.
@Entity('hr_card_sources')
export class CardSource extends BaseEntity {
  @Column()
  name!: string

  @Column({ default: '' })
  code!: string

  @Column({ default: 'generic' })
  kind!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'jsonb', default: () => "'{}'" })
  config!: Record<string, unknown>

  @Column({ default: 'Europe/Istanbul' })
  timezone!: string

  @Column({ type: 'jsonb', default: () => "'{}'" })
  directionMapping!: Record<string, AccessDirection>

  // Secret — select:false so it never leaves the DB unless explicitly requested.
  @Column({ type: 'varchar', nullable: true, select: false })
  apiKey!: string | null

  @Column({ default: true })
  isActive!: boolean
}
