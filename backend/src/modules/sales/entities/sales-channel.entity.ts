import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import type { SalesChannelType } from '@turbohesap/shared'

// A sales channel: a route through which products are sold. Master data later
// referenced by products. camelCase props → snake_case columns via the global
// SnakeNamingStrategy (no @Column name overrides).
@Entity('sales_channels')
export class SalesChannel {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column()
  code!: string

  @Column()
  name!: string

  @Column({ default: 'other' })
  type!: SalesChannelType

  @Column({ default: '' })
  description!: string

  @Column({ default: true })
  isActive!: boolean

  @Column({ default: false })
  isDefault!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  // double precision → JS number (numeric/decimal would return a string).
  @Column({ type: 'double precision', nullable: true })
  commissionRate!: number | null

  @Column({ default: 'TRY' })
  currency!: string

  @Column({ default: '' })
  website!: string

  // İletişim / Yetkili
  @Column({ default: '' })
  contactName!: string

  @Column({ default: '' })
  contactTitle!: string

  @Column({ default: '' })
  contactPhone!: string

  @Column({ default: '' })
  contactEmail!: string

  // Adres
  @Column({ default: 'Türkiye' })
  country!: string

  @Column({ default: '' })
  city!: string

  @Column({ default: '' })
  district!: string

  @Column({ default: '' })
  addressLine!: string

  @Column({ default: '' })
  postalCode!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
