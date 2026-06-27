import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import type { ProductType, VariantAttribute } from '@turbohesap/shared'

// A product / stock item. May be a **simple** product or a **template** with
// variants (`hasVariants` + `variantAttributes`). `categoryId` links to a
// Category (whose `fieldDefs` describe the custom attributes); `attributes`
// (jsonb) holds those custom values. `unit` is a `birim` lookup key. Per-branch
// stock, per-channel prices, variants and packagings live in sibling tables.
@Entity('inventory_products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column()
  code!: string

  @Column()
  name!: string

  @Column({ default: '' })
  description!: string

  @Column({ default: '' })
  barcode!: string

  @Column({ default: '' })
  brand!: string

  // Stockable goods vs services vs consumables.
  @Column({ default: 'stockable' })
  type!: ProductType

  // Whether on-hand stock is tracked for this product.
  @Column({ default: true })
  trackStock!: boolean

  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null

  // Unit of measure — a `birim` lookup key (e.g. "ADET").
  @Column({ default: '' })
  unit!: string

  // Variants — when `hasVariants`, `variantAttributes` define the axes
  // (e.g. [{ name: "Renk", values: [...] }]) and concrete rows live in
  // inventory_product_variants.
  @Column({ default: false })
  hasVariants!: boolean

  @Column({ type: 'jsonb', default: () => "'[]'" })
  variantAttributes!: VariantAttribute[]

  // Fiyatlandırma (double precision → JS numbers)
  @Column({ type: 'double precision', nullable: true })
  purchasePrice!: number | null

  @Column({ type: 'double precision', nullable: true })
  salePrice!: number | null

  @Column({ type: 'double precision', nullable: true })
  taxRate!: number | null

  @Column({ default: 'TRY' })
  currency!: string

  // Stok
  @Column({ type: 'double precision', default: 0 })
  quantity!: number

  @Column({ type: 'double precision', default: 0 })
  minQuantity!: number

  // Unit weight (kg) — optional logistics field.
  @Column({ type: 'double precision', nullable: true })
  weight!: number | null

  @Column({ default: '' })
  imageUrl!: string

  @Column({ default: true })
  isActive!: boolean

  // Category-specific custom attribute values (keyed by CategoryFieldDef.key).
  @Column({ type: 'jsonb', default: () => "'{}'" })
  attributes!: Record<string, unknown>

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
