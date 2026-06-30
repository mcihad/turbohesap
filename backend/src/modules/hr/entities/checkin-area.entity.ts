import { Column, Entity, Index } from 'typeorm'

import type { CheckinTimeWindow, GeoJsonGeometry } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Giriş alanı (geofence) — PostGIS geometry column ALWAYS named `geom`. Holds a
// Polygon (drawn boundary) or a Point (center used with toleranceMeters as a
// radius). TypeORM round-trips the value as GeoJSON. A GIST index on `geom` is
// added in the migration. Validation uses ST_DWithin(geom::geography, …).
@Entity('hr_checkin_areas')
export class CheckinArea extends BaseEntity {
  @Column()
  name!: string

  @Column({ default: '' })
  code!: string

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column('geometry', { srid: 4326, nullable: true })
  geom!: GeoJsonGeometry | null

  @Column({ type: 'int', default: 100 })
  toleranceMeters!: number

  @Column({ type: 'int', default: 100 })
  minAccuracyMeters!: number

  @Column({ type: 'jsonb', default: () => "'[]'" })
  timeWindows!: CheckinTimeWindow[]

  @Column({ type: 'jsonb', default: () => "'{}'" })
  attributes!: Record<string, unknown>

  @Column({ default: true })
  requireInside!: boolean

  @Column({ default: false })
  allowMockLocation!: boolean

  @Column({ default: true })
  isActive!: boolean

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
