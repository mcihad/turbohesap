import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import type { CategoryFieldDef } from '@turbohesap/shared'

// A product category in an adjacency-list tree (`parentId` → parent, null = root).
// `fieldDefs` (jsonb) is the per-category product-attribute schema. Integrity
// (no cycles, no deleting a category with children) is enforced in the service.
@Entity('inventory_categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null

  @Column()
  name!: string

  @Column({ default: '' })
  code!: string

  @Column({ default: '' })
  description!: string

  // Image address; a file picker will populate this later.
  @Column({ default: '' })
  imageUrl!: string

  @Column({ default: true })
  isActive!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  // Custom product-field definitions for this category.
  @Column({ type: 'jsonb', default: () => "'[]'" })
  fieldDefs!: CategoryFieldDef[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
