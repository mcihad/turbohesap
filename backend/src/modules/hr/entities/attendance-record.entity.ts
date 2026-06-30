import { Column, Entity, Index } from 'typeorm'

import type {
  AttendanceDirection,
  AttendanceMethod,
  AttendanceStatus,
  GeoJsonPoint,
} from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'
import { nullableDecimalTransformer } from '../../../common/decimal.transformer'

// Giriş/çıkış kaydı — one table for mobile GPS, imported card events, and manual
// entries (`method` discriminates). `geom` (PostGIS Point) holds the check-in
// location; lat/lng kept numeric for display. UNIQUE(source, externalId) on card
// rows for idempotent re-import (partial index, added in the migration).
@Entity('hr_attendance_records')
@Index(['employeeId', 'eventTime'])
export class AttendanceRecord extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true })
  employeeId!: string | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null

  @Column({ type: 'timestamptz' })
  eventTime!: Date

  @Column({ default: 'unknown' })
  direction!: AttendanceDirection

  @Column({ default: 'mobile_gps' })
  method!: AttendanceMethod

  @Column('numeric', { precision: 9, scale: 6, nullable: true, transformer: nullableDecimalTransformer })
  lat!: number | null

  @Column('numeric', { precision: 9, scale: 6, nullable: true, transformer: nullableDecimalTransformer })
  lng!: number | null

  @Column('numeric', { precision: 9, scale: 2, nullable: true, transformer: nullableDecimalTransformer })
  accuracyMeters!: number | null

  @Column('geometry', { spatialFeatureType: 'Point', srid: 4326, nullable: true })
  geom!: GeoJsonPoint | null

  @Index()
  @Column({ type: 'uuid', nullable: true })
  areaId!: string | null

  @Column('numeric', { precision: 12, scale: 2, nullable: true, transformer: nullableDecimalTransformer })
  distanceMeters!: number | null

  @Column({ default: false })
  withinGeofence!: boolean

  @Column({ default: false })
  withinTimeWindow!: boolean

  @Column({ default: false })
  isMockLocation!: boolean

  @Column({ default: 'valid' })
  status!: AttendanceStatus

  @Column({ type: 'varchar', nullable: true })
  flagReason!: string | null

  @Column({ type: 'varchar', nullable: true })
  cardNo!: string | null

  @Index()
  @Column({ type: 'varchar', nullable: true })
  source!: string | null

  @Column({ type: 'varchar', nullable: true })
  externalId!: string | null

  @Column({ type: 'jsonb', nullable: true })
  deviceInfo!: Record<string, unknown> | null

  @Column({ type: 'uuid', nullable: true })
  shiftDayId!: string | null

  @Column({ type: 'jsonb', nullable: true })
  raw!: Record<string, unknown> | null

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
