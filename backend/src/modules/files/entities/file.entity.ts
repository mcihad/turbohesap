import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '../../../common/entities/base.entity'
import type { FileKind, FileStorage } from '@turbohesap/shared'

// A stored file. Bytes live in the configured storage under the random
// `storedName`; everything else (human name, type, size, owner) is kept here.
// The owner is polymorphic — (entityType, entityId) reference ANY entity with no
// DB FK, so any module can attach files without coupling.
@Entity('files')
@Index(['entityType', 'entityId'])
export class FileEntity extends BaseEntity {
  @Column()
  originalName!: string

  // Random, unguessable storage key — also the public access capability.
  @Index({ unique: true })
  @Column()
  storedName!: string

  @Column()
  mimeType!: string

  @Column({ default: '' })
  extension!: string

  // bigint in PG (returns string) → mapped to a JS number.
  @Column({
    type: 'bigint',
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string | null) => (v == null ? 0 : Number(v)) },
  })
  size!: number

  @Column({ default: 'file' })
  kind!: FileKind

  @Column({ default: false })
  isImage!: boolean

  @Column({ default: 'local' })
  storage!: FileStorage

  @Column({ type: 'varchar', nullable: true })
  entityType!: string | null

  @Column({ type: 'uuid', nullable: true })
  entityId!: string | null

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'uuid', nullable: true })
  uploadedById!: string | null
}
