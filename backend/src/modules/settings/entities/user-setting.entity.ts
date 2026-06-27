import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// One per (user, type) — a user's saved data for some UI surface. `type`
// namespaces the setting (e.g. "grid:inventory.products"); `data` is opaque jsonb
// whose shape the client owns (grid column state, prefs, …).
@Entity('user_settings')
@Index(['userId', 'type'], { unique: true })
export class UserSetting extends BaseEntity {
  @Column({ type: 'uuid' })
  userId!: string

  @Column()
  type!: string

  @Column({ type: 'jsonb', default: () => "'{}'" })
  data!: unknown
}
