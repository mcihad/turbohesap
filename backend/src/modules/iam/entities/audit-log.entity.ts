import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

import type { AuditAction, AuditLogChange } from '@turbohesap/shared'

// A data-layer audit entry: one tracked entity mutation, written automatically
// by AuditSubscriber inside the same transaction as the change. Itself excluded
// from auditing (see IGNORED_AUDIT_ENTITIES) to avoid recursion.
@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column()
  entityType!: string

  @Column({ type: 'varchar', nullable: true })
  entityId!: string | null

  @Column({ type: 'varchar', nullable: true })
  tableName!: string | null

  @Column({ type: 'varchar', nullable: true })
  module!: string | null

  @Column({ type: 'varchar' })
  action!: AuditAction

  // Field-level diff ({ field, oldValue, newValue }[]) stored as jsonb.
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  changes!: AuditLogChange[]

  @Column({ type: 'varchar', nullable: true })
  ipAddress!: string | null

  @Column({ type: 'varchar', nullable: true })
  userId!: string | null

  @Column({ type: 'varchar', nullable: true })
  userName!: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date
}
