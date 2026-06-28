import { Column, Entity, Index } from 'typeorm'

import type { PosRegisterSettings } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// A POS register/terminal bound to a branch, optionally to a sales channel.
@Entity('pos_registers')
export class PosRegister extends BaseEntity {
  @Column()
  name!: string

  @Index({ unique: true })
  @Column()
  code!: string

  @Index()
  @Column({ type: 'uuid' })
  branchId!: string

  @Column({ type: 'uuid', nullable: true })
  salesChannelId!: string | null

  @Column({ type: 'uuid', nullable: true })
  defaultCashAccountId!: string | null

  @Column({ type: 'jsonb', default: () => "'{}'" })
  settings!: Partial<PosRegisterSettings>

  @Column({ default: true })
  isActive!: boolean
}
