import { Column, Entity, Index } from 'typeorm'

import type { BomType, ConsumptionPolicy } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import {
  decimalTransformer,
  nullableDecimalTransformer,
} from '../../../common/decimal.transformer'

// Ürün reçetesi / ürün ağacı (Bill of Materials) — header. Bileşenler/operasyonlar/
// yan ürünler ayrı tablolarda (bomId).
@Entity('production_boms')
export class Bom extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Index({ unique: true })
  @Column()
  code!: string

  @Column({ default: '' })
  name!: string

  @Column({ default: 'manufacture' })
  type!: BomType

  @Column('numeric', { precision: 18, scale: 4, default: 1, transformer: decimalTransformer })
  outputQuantity!: number

  @Column({ default: 'ADET' })
  unit!: string

  @Column({ type: 'int', default: 1 })
  version!: number

  @Column({ type: 'varchar', nullable: true })
  revision!: string | null

  @Column({ type: 'date', nullable: true })
  validFrom!: string | null

  @Column({ type: 'date', nullable: true })
  validTo!: string | null

  @Column({ default: 'warn' })
  consumptionPolicy!: ConsumptionPolicy

  @Column('numeric', { precision: 7, scale: 2, nullable: true, transformer: nullableDecimalTransformer })
  manufLeadTimeDays!: number | null

  @Index()
  @Column({ default: true })
  isActive!: boolean

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
