import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import type { BranchType } from '@turbohesap/shared'

// A branch: a physical location of the organization. Users are authorized for
// branches (see iam User.branches many-to-many). camelCase props → snake_case
// columns via the global SnakeNamingStrategy.
@Entity('org_branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column()
  code!: string

  @Column()
  name!: string

  @Column({ default: 'branch' })
  type!: BranchType

  @Column({ default: '' })
  description!: string

  @Column({ default: true })
  isActive!: boolean

  // İletişim
  @Column({ default: '' })
  phone!: string

  @Column({ default: '' })
  secondaryPhone!: string

  @Column({ default: '' })
  fax!: string

  @Column({ default: '' })
  email!: string

  @Column({ default: '' })
  website!: string

  // Adres
  @Column({ default: 'Türkiye' })
  country!: string

  @Column({ default: '' })
  city!: string

  @Column({ default: '' })
  district!: string

  @Column({ default: '' })
  neighborhood!: string

  @Column({ default: '' })
  addressLine!: string

  @Column({ default: '' })
  postalCode!: string

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null

  // Yetkili / Şube müdürü
  @Column({ default: '' })
  managerName!: string

  @Column({ default: '' })
  managerTitle!: string

  @Column({ default: '' })
  managerPhone!: string

  @Column({ default: '' })
  managerEmail!: string

  // Yasal / Vergi
  @Column({ default: '' })
  taxOffice!: string

  @Column({ default: '' })
  taxNumber!: string

  @Column({ type: 'timestamptz', nullable: true })
  openingDate!: Date | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
