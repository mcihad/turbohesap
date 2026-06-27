import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

// A generic reference-data item: a key/value pair within a named list. The
// (list, key) pair is unique so a list never has two items with the same code.
@Entity('lookup_items')
@Index('UQ_lookup_list_key', ['list', 'key'], { unique: true })
export class LookupItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column()
  list!: string

  @Column()
  key!: string

  @Column()
  value!: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ default: true })
  isActive!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
