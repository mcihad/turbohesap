import { Column, Entity, Index } from 'typeorm'

import type { CrmFieldDef, CrmFieldEntity } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Custom field definitions for a CRM entity (one row per entity: contact|opportunity).
@Entity('crm_field_defs')
export class CrmFieldDefEntity extends BaseEntity {
  @Index({ unique: true })
  @Column()
  entity!: CrmFieldEntity

  @Column({ type: 'jsonb', default: () => "'[]'" })
  fields!: CrmFieldDef[]
}
