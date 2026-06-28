import { Column, Entity } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// Satış hattı (Pipeline) — a named set of deal stages. Multiple pipelines allow
// different sales processes; exactly one is the default.
@Entity('crm_pipelines')
export class Pipeline extends BaseEntity {
  @Column()
  name!: string

  @Column({ type: 'text', default: '' })
  description!: string

  @Column({ default: false })
  isDefault!: boolean

  @Column({ default: true })
  isActive!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
