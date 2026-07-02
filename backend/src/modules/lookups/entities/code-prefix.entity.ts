import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// A "prefix + running counter" numbering config, scoped per usage `context`
// (e.g. "inventory.products"). See code-prefixes.service.ts for the atomic
// consume() that issues codes without a race condition.
@Entity('lookup_code_prefixes')
@Index('UQ_lookup_code_prefix_context_prefix', ['context', 'prefix'], { unique: true })
export class CodePrefix extends BaseEntity {
  @Index()
  @Column()
  context!: string

  @Column()
  prefix!: string

  @Column({ type: 'int', default: 4 })
  padding!: number

  @Column({ type: 'int', default: 1 })
  nextNumber!: number

  @Column({ default: false })
  incrementOnSave!: boolean

  @Column({ default: true })
  isActive!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
