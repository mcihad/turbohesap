import { Column, Entity, Index } from 'typeorm'

import type { AssetAssignmentStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Zimmet (custody) ledger row. The single `active` row per asset is the current
// custodian; assign/return/transfer open and close rows. `employeeName` is
// snapshotted so the ledger reads correctly even if the personel record changes.
@Entity('inventory_asset_assignments')
export class AssetAssignment extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  assetId!: string

  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string

  @Column()
  employeeName!: string

  @Index()
  @Column({ default: 'active' })
  status!: AssetAssignmentStatus

  @Column({ type: 'uuid', nullable: true })
  assignedById!: string | null

  @Column({ type: 'varchar', nullable: true })
  assignedByName!: string | null

  @Column({ type: 'timestamptz' })
  assignedAt!: Date

  @Column({ type: 'timestamptz', nullable: true })
  returnedAt!: Date | null

  @Column({ type: 'uuid', nullable: true })
  transferId!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
