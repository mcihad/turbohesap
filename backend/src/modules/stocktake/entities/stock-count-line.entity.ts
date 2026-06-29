import { Column, Entity, Index } from 'typeorm'

import type { CountLineStatus, CountReason } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// One countable unit of a stock-count: a product (or a specific variant). Snapshots
// code/name/barcode/unit at creation so the line is stable even if the catalog
// changes. `expectedQty` is the system on-hand at session start; `countedQty`
// accumulates physical observations; `difference` is computed (counted − expected).
@Entity('stock_count_lines')
export class StockCountLine extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  countId!: string

  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Column({ default: '' })
  code!: string

  @Column({ default: '' })
  name!: string

  @Column({ default: '' })
  barcode!: string

  @Column({ default: '' })
  unit!: string

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  expectedQty!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  countedQty!: number

  @Column({ type: 'varchar', nullable: true })
  reasonCode!: CountReason | null

  @Column({ default: 'pending' })
  status!: CountLineStatus

  @Column({ default: false })
  recountRequested!: boolean

  @Column({ type: 'uuid', nullable: true })
  counterId!: string | null

  @Column({ type: 'timestamptz', nullable: true })
  lastCountedAt!: Date | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
