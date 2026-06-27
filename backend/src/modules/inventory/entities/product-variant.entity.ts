import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

// A concrete variant of a template Product (e.g. Renk=Kırmızı, Beden=M). Each has
// its own SKU/barcode and an optional price override (or a `priceExtra` delta on
// top of the template). `productId` is a plain uuid (no relation — matches the
// repo convention; the service cascades deletes).
@Entity('inventory_product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Index({ unique: true })
  @Column()
  code!: string

  @Column({ default: '' })
  barcode!: string

  // The chosen value per attribute name, e.g. { Renk: "Kırmızı", Beden: "M" }.
  @Column({ type: 'jsonb', default: () => "'{}'" })
  attributeValues!: Record<string, string>

  @Column({ type: 'double precision', default: 0 })
  priceExtra!: number

  @Column({ type: 'double precision', nullable: true })
  salePrice!: number | null

  @Column({ type: 'double precision', nullable: true })
  purchasePrice!: number | null

  @Column({ default: true })
  isActive!: boolean

  @Column({ default: '' })
  imageUrl!: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
