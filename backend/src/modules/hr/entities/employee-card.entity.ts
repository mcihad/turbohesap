import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// Personel kart eşlemesi — maps a card number (and/or external personnel id) to an
// employee. Supports replaced/multiple cards with validity windows.
@Entity('hr_employee_cards')
export class EmployeeCard extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string

  @Index()
  @Column()
  cardNo!: string

  @Index()
  @Column({ type: 'varchar', nullable: true })
  externalPersonnelId!: string | null

  @Column({ type: 'date', nullable: true })
  validFrom!: string | null

  @Column({ type: 'date', nullable: true })
  validTo!: string | null

  @Column({ default: true })
  isActive!: boolean
}
