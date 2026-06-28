import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// A dine-in table (masa) on a floor. A PosOrder references it via tableId.
@Entity('pos_tables')
export class PosTable extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  floorId!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column()
  name!: string

  @Column({ type: 'int', default: 0 })
  seats!: number

  @Column({ type: 'int', default: 0 })
  posX!: number

  @Column({ type: 'int', default: 0 })
  posY!: number

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ default: true })
  isActive!: boolean
}
