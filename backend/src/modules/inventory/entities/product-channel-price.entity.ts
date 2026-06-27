import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

// A Product's (or variant's) sale price on a specific sales channel. Channels
// (sales_channels) double as price lists. Overrides the base/variant price for
// that channel. Uniqueness of (productId, variantId, channelId) is enforced in
// the service.
@Entity('inventory_product_channel_prices')
@Index(['productId', 'variantId', 'channelId'])
export class ProductChannelPrice {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  variantId!: string | null

  @Index()
  @Column({ type: 'uuid' })
  channelId!: string

  @Column({ type: 'double precision', default: 0 })
  salePrice!: number

  @Column({ type: 'varchar', nullable: true })
  currency!: string | null

  @Column({ default: true })
  isActive!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
