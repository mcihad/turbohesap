import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'

// The generic, reusable "any kind of paper/document" record. May or may not
// have actual bytes attached (see `/api/files`, `entityType='Document'`).
// `attributes` is schema-driven (per `categoryId`'s `fieldDefs`); `tags` and
// `metadata` are free-form (the latter reserved for future OCR/processing).
// `relatedEntityType`/`relatedEntityId` is a polymorphic pointer to the business
// entity this document is about (e.g. a finance `FinancialInstrument`, an
// `Asset`) — this module never depends on the entities it's pointed at from.
@Entity('documents')
@Index(['relatedEntityType', 'relatedEntityId'])
export class Document extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null

  @Column()
  title!: string

  @Column({ default: '' })
  code!: string

  @Column({ default: '' })
  description!: string

  @Column({ type: 'jsonb', default: () => "'{}'" })
  attributes!: Record<string, unknown>

  @Column({ type: 'jsonb', default: () => "'[]'" })
  tags!: string[]

  // Free-form, reserved for future OCR/processing pipelines.
  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>

  @Column({ type: 'text', nullable: true })
  ocrText!: string | null

  @Column({ type: 'varchar', nullable: true })
  ocrStatus!: string | null

  @Column({ default: false })
  isTimeBound!: boolean

  @Column({ type: 'date', nullable: true })
  issueDate!: string | null

  @Index()
  @Column({ type: 'date', nullable: true })
  expiryDate!: string | null

  @Column({ type: 'int', nullable: true })
  reminderDaysBefore!: number | null

  @Index()
  @Column({ default: false })
  isPrivate!: boolean

  @Index()
  @Column({ type: 'uuid', nullable: true })
  ownerId!: string | null

  @Column({ type: 'varchar', nullable: true })
  relatedEntityType!: string | null

  @Column({ type: 'uuid', nullable: true })
  relatedEntityId!: string | null

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null
}
