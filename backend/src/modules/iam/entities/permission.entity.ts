import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

// A Permission is a single granular capability, keyed as
// "<module>.<resource>.<action>" (e.g. "iam.users.read"). Permissions form a
// fixed catalog seeded at startup; roles aggregate them.
@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column()
  key!: string

  @Column({ default: '' })
  description!: string

  // Logical grouping for UI (usually the resource, e.g. "users").
  @Column({ default: '' })
  group!: string

  @CreateDateColumn()
  createdAt!: Date
}
