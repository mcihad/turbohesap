import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

import type { ErrorLogOrigin, ErrorLogStatus } from '@turbohesap/shared'

// A captured error (500 from the server's exception filter, or a client-reported
// one). Repeats of the same fingerprint (hash) fold into a single row whose
// occurrenceCount / lastSeenAt advance. Excluded from auditing.
@Entity('error_logs')
@Index(['hash'], { unique: true })
@Index(['status'])
@Index(['origin'])
@Index(['lastSeenAt'])
export class ErrorLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column()
  hash!: string

  @Column({ type: 'varchar', default: 'server' })
  origin!: ErrorLogOrigin

  @Column({ type: 'varchar', nullable: true })
  module!: string | null

  @Column({ type: 'text' })
  message!: string

  @Column()
  exceptionType!: string

  @Column({ type: 'text', nullable: true })
  stackTrace!: string | null

  @Column({ type: 'varchar', nullable: true })
  source!: string | null

  @Column({ type: 'varchar', nullable: true })
  fileName!: string | null

  @Column({ type: 'int', nullable: true })
  lineNumber!: number | null

  @Column({ type: 'varchar', nullable: true })
  httpMethod!: string | null

  @Column({ type: 'varchar', nullable: true })
  path!: string | null

  @Column({ type: 'text', nullable: true })
  queryString!: string | null

  @Column({ type: 'int', default: 500 })
  statusCode!: number

  @Column({ type: 'varchar', nullable: true })
  ipAddress!: string | null

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null

  @Column({ type: 'jsonb', nullable: true })
  headers!: Record<string, string> | null

  @Column({ type: 'varchar', nullable: true })
  userId!: string | null

  @Column({ type: 'varchar', nullable: true })
  userName!: string | null

  @Column({ type: 'varchar', default: 'new' })
  status!: ErrorLogStatus

  @Column({ type: 'text', nullable: true })
  developerNotes!: string | null

  @Column({ type: 'int', default: 1 })
  occurrenceCount!: number

  @Column({ type: 'timestamptz' })
  firstSeenAt!: Date

  @Column({ type: 'timestamptz' })
  lastSeenAt!: Date
}
