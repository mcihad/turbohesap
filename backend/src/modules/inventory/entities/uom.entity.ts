import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import { decimalTransformer } from '../../../common/decimal.transformer'

// Ölçü birimi (Unit of Measure). `code` mevcut `birim` lookup anahtarı ile uyumlu
// (ADET/KG/GR…) ve benzersizdir. `factorToReference`: bu birimden 1 adet, kategori
// referans biriminin kaç katıdır (g→kg = 0.001).
@Entity('inventory_uoms')
export class Uom extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  categoryId!: string

  @Index({ unique: true })
  @Column()
  code!: string

  @Column()
  name!: string

  @Column('numeric', { precision: 18, scale: 8, default: 1, transformer: decimalTransformer })
  factorToReference!: number

  @Column('numeric', { precision: 18, scale: 8, default: 1, transformer: decimalTransformer })
  rounding!: number

  @Column({ default: false })
  isReference!: boolean

  @Column({ default: true })
  isActive!: boolean
}
