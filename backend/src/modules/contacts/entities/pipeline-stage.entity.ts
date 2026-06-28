import { Column, Entity, Index } from 'typeorm'

import type { StageType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Aşama (PipelineStage) — a column of a pipeline. `type` (open|won|lost) drives
// closed/won logic; `probability` seeds a deal's win %; `rottingDays` flags
// stale deals; `color` is the board column accent.
@Entity('crm_pipeline_stages')
export class PipelineStage extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  pipelineId!: string

  @Column()
  name!: string

  @Column()
  key!: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column('numeric', { precision: 5, scale: 2, default: 0, transformer: decimalTransformer })
  probability!: number

  @Column({ default: 'open' })
  type!: StageType

  @Column({ type: 'int', default: 0 })
  rottingDays!: number

  @Column({ default: '#6366f1' })
  color!: string
}
