import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

// A unit multiplier ("çarpan") of a Product — a sellable pack of N base units
// with its own barcode and price (e.g. a 6-pack of bottled water). `variantId`
// null = applies to the whole product; otherwise restricted to one variant.
@Entity('inventory_product_packagings')
export class ProductPackaging {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Column()
  name!: string

  // Pack unit — a `birim` lookup key (e.g. "KOLI").
  @Column({ default: '' })
  unit!: string

  // How many base units this pack contains (the multiplier, e.g. 6).
  @Column({ type: 'double precision', default: 1 })
  quantity!: number

  @Column({ default: '' })
  barcode!: string

  @Column({ type: 'double precision', nullable: true })
  salePrice!: number | null

  @Column({ type: 'double precision', nullable: true })
  purchasePrice!: number | null

  @Column({ default: true })
  isActive!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
