import { Column, Entity, Index } from 'typeorm'

import type { DocumentFieldDef } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// An evrak (document) category in an adjacency-list tree (`parentId` → parent,
// null = root) — mirrors `inventory/entities/category.entity.ts`. `fieldDefs`
// (jsonb) is the per-category document-attribute schema. Integrity (no cycles,
// no deleting a category with children) is enforced in the service.
//
// `isPrivate`/`ownerId` hide the category itself from non-owners (unless the
// caller holds `documents.private.readAll`) and act only as a **create-time
// default** for documents filed under it — see `document.entity.ts`.
@Entity('document_categories')
export class DocumentCategory extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null

  @Column()
  name!: string

  @Column({ default: '' })
  code!: string

  @Column({ default: '' })
  description!: string

  @Column({ default: true })
  isActive!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ default: false })
  isPrivate!: boolean

  @Column({ type: 'uuid', nullable: true })
  ownerId!: string | null

  // Custom document-field definitions for this category.
  @Column({ type: 'jsonb', default: () => "'[]'" })
  fieldDefs!: DocumentFieldDef[]
}
