import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// An immutable audit row: one counted observation (scan or manual entry) applied
// to a stock_count_line. The line's countedQty is the running sum of its scans.
@Entity('stock_count_scans')
export class StockCountScan extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  countId!: string

  @Index()
  @Column({ type: 'uuid' })
  lineId!: string

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  qty!: number

  @Column({ type: 'uuid' })
  scannedById!: string
}
