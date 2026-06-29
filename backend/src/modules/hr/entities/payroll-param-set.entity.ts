import { Column, Entity, Index } from 'typeorm'

import type { PayrollParams } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Bordro parametreleri — rates/brackets/minimum-wage, versioned BY YEAR so the
// numbers can change with the law without touching the engine.
@Entity('hr_payroll_params')
export class PayrollParamSet extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'int' })
  year!: number

  @Column({ type: 'jsonb', default: () => "'{}'" })
  params!: PayrollParams
}
