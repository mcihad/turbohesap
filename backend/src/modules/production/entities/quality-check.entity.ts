import { Column, Entity, Index } from 'typeorm'

import type { QualityCheckResult, QualityCheckType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Kalite kontrol kaydı — operasyon/mamul bazlı geç/kal. qualityCheckRequired olan
// bir iş emri geçen (pass) bir kayıt olmadan bitirilemez.
@Entity('production_quality_checks')
export class QualityCheck extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  manufacturingOrderId!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  workOrderId!: string | null

  @Column({ type: 'uuid', nullable: true })
  operationId!: string | null

  @Column({ default: 'operation' })
  checkType!: QualityCheckType

  @Index()
  @Column()
  result!: QualityCheckResult

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  inspectedQuantity!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  passedQuantity!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  rejectedQuantity!: number

  @Column({ type: 'uuid', nullable: true })
  inspectorEmployeeId!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @Column({ type: 'timestamptz' })
  checkedAt!: Date
}
