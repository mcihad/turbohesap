import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

// Shared base for entities: uuid primary key + created/updated timestamps.
// New module entities should extend this instead of repeating the boilerplate
// (the SnakeNamingStrategy maps these to id / created_at / updated_at).
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
