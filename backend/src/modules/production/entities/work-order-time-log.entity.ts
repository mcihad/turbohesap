import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// İş Emri zaman logu — bir başlat→duraklat/bitir aralığı. Toplam gerçek süre
// (durationMinutes) operasyon maliyeti hesabında kullanılır.
@Entity('production_work_order_time_logs')
export class WorkOrderTimeLog extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  workOrderId!: string

  @Column({ type: 'uuid', nullable: true })
  employeeId!: string | null

  @Column({ type: 'timestamptz' })
  startedAt!: Date

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null

  @Column('numeric', { precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  durationMinutes!: number

  @Column({ type: 'text', nullable: true })
  note!: string | null
}
