import { Column, Entity, Index } from 'typeorm'

import type { WorkOrderStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// İş Emri (Work Order) — bir Üretim Emrinin tek operasyonu. Saha terminalinde
// başlat/duraklat/devam/bitir akışı; her aktif aralık WorkOrderTimeLog üretir.
@Entity('production_work_orders')
export class WorkOrder extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  manufacturingOrderId!: string

  // Operation snapshot (the BOM operation it was created from).
  @Column({ type: 'uuid', nullable: true })
  operationId!: string | null

  @Column({ type: 'int', default: 10 })
  sequence!: number

  @Column()
  name!: string

  @Index()
  @Column({ type: 'uuid' })
  workCenterId!: string

  @Index()
  @Column({ default: 'pending' })
  status!: WorkOrderStatus

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  plannedQuantity!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  producedQuantity!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  rejectedQuantity!: number

  @Column({ default: 'ADET' })
  unit!: string

  @Column('numeric', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  plannedSetupMinutes!: number

  @Column('numeric', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  plannedRunMinutes!: number

  @Column('numeric', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  actualMinutes!: number

  @Column({ type: 'uuid', nullable: true })
  assignedEmployeeId!: string | null

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null

  @Column({ default: false })
  qualityCheckRequired!: boolean

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
