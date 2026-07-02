import { Column, Entity, Index } from 'typeorm'

import type { SubcontractDispatchStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Fason sevk belgesi — bir Üretim Emrinin hammaddesini fasoncuya gönderme + geri
// alma. serviceCost = fasoncu işçilik ücreti (MO maliyet rollup'ına girer).
@Entity('production_subcontract_dispatches')
export class SubcontractDispatch extends BaseEntity {
  @Index({ unique: true })
  @Column()
  dispatchNo!: string

  @Index()
  @Column({ type: 'uuid' })
  manufacturingOrderId!: string

  @Index()
  @Column({ type: 'uuid' })
  contactId!: string

  @Column({ type: 'date' })
  dispatchDate!: string

  @Column({ type: 'date', nullable: true })
  expectedReturnDate!: string | null

  @Index()
  @Column({ default: 'draft' })
  status!: SubcontractDispatchStatus

  @Column('numeric', { precision: 18, scale: 4, default: 0, transformer: decimalTransformer })
  serviceCost!: number

  @Column({ default: 'TRY' })
  currency!: string

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
