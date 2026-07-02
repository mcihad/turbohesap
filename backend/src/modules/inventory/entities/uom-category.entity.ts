import { Column, Entity } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// Ölçü birimi kategorisi (UoM category) — dönüşüm yalnız kategori içinde geçerli.
// `referenceUomCode` kategorinin baz birimidir (factorToReference = 1).
@Entity('inventory_uom_categories')
export class UomCategory extends BaseEntity {
  @Column()
  name!: string

  @Column()
  referenceUomCode!: string

  @Column({ default: true })
  isActive!: boolean
}
