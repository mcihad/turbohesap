import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Branch } from '../../org/entities/branch.entity'
import { Role } from './role.entity'

// An application user authenticated with a local username + password. Roles
// (and through them permissions) drive authorization.
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column()
  username!: string

  @Index({ unique: true })
  @Column()
  email!: string

  // bcrypt hash; never serialized out of the API (services map to DTOs).
  @Column({ select: false })
  passwordHash!: string

  @Column({ default: '' })
  firstName!: string

  @Column({ default: '' })
  lastName!: string

  @Column({ default: true })
  isActive!: boolean

  @ManyToMany(() => Role, { eager: true })
  @JoinTable({ name: 'user_roles' })
  roles!: Role[]

  // Branches this user is authorized for (org module). Eager so the DTO mapper
  // always has them; the join table is owned here (the user side).
  @ManyToMany(() => Branch, { eager: true })
  @JoinTable({ name: 'user_branches' })
  branches!: Branch[]

  // Telegram chat id for direct notifications/messages to this user.
  @Column({ type: 'varchar', nullable: true })
  telegramChatId!: string | null

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
