import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// A floor/section (kat) grouping dine-in tables.
@Entity('pos_floors')
export class PosFloor extends BaseEntity {
  @Column()
  name!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ default: true })
  isActive!: boolean
}
