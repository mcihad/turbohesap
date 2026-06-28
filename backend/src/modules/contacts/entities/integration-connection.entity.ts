import { Column, Entity, Index } from 'typeorm'

import type { IntegrationType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// A configured integration provider (one row per type). `config` holds both
// non-secret and secret values; secrets are masked when serialized out.
@Entity('crm_integrations')
export class IntegrationConnection extends BaseEntity {
  @Index({ unique: true })
  @Column()
  type!: IntegrationType

  @Column({ default: '' })
  name!: string

  @Column({ default: false })
  isActive!: boolean

  @Column({ type: 'jsonb', default: () => "'{}'" })
  config!: Record<string, string>
}
