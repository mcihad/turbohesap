import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

// On-hand stock of a Product (or a specific variant) at a branch. Branches
// (org_branches) double as stock locations. `branchId` null = general/unassigned
// stock; `variantId` null = the simple product. Uniqueness of
// (productId, variantId, branchId) is enforced in the service — Postgres treats
// NULLs as distinct, so a DB unique index can't.
@Entity('inventory_product_stocks')
@Index(['productId', 'variantId', 'branchId'])
export class ProductStock {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ type: 'double precision', default: 0 })
  quantity!: number

  // Reserved for confirmed manufacturing orders / sales allocations. NOT a ledger
  // movement — on-hand stays `quantity`; available = quantity - reservedQty.
  @Column({ type: 'double precision', default: 0 })
  reservedQty!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
