import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Fason sevk satırı — gönderilen bir hammadde/bileşen. atSubcontractor =
// sentQuantity − returnedQuantity (fasoncuda kalan).
@Entity('production_subcontract_dispatch_lines')
export class SubcontractDispatchLine extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  dispatchId!: string

  @Column({ type: 'uuid' })
  componentProductId!: string

  @Column({ type: 'uuid', nullable: true })
  componentVariantId!: string | null

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  sentQuantity!: number

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  returnedQuantity!: number

  @Column({ default: 'ADET' })
  unit!: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
