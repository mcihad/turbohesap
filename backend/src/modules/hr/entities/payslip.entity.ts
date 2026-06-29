import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Bordro fişi (maaş pusulası) — the full computed breakdown for one employee in a
// run. Numbers mirror the engine's PayslipBreakdown to the kuruş.
@Entity('hr_payslips')
export class Payslip extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  runId!: string

  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string

  @Column({ type: 'int' })
  year!: number

  @Column({ type: 'int' })
  month!: number

  @Column('numeric', { precision: 5, scale: 1, default: 30, transformer: decimalTransformer })
  days!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  brut!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  sgkMatrah!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  sgkIsci!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  issizlikIsci!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  gvMatrah!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  kumulatifMatrahOnce!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  gelirVergisi!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  damga!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  gvIstisna!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  damgaIstisna!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  net!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  sgkIsveren!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  issizlikIsveren!: number

  @Column('numeric', { precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  isverenMaliyet!: number

  @Column({ type: 'uuid', nullable: true })
  financeTransactionId!: string | null

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null
}
