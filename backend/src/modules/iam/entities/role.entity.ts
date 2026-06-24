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

import { Permission } from './permission.entity'

// A Role groups permissions and is assigned to users. System roles (admin, user)
// are seeded and cannot be deleted.
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index({ unique: true })
  @Column()
  name!: string

  @Column({ default: '' })
  description!: string

  // The module this role belongs to (one of @turbohesap/shared MODULE_KEYS).
  @Column({ default: '' })
  module!: string

  // System roles are protected from deletion/rename in the API.
  @Column({ default: false })
  isSystem!: boolean

  @ManyToMany(() => Permission, { eager: true })
  @JoinTable({ name: 'role_permissions' })
  permissions!: Permission[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
