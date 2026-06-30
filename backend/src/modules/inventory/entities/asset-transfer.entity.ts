import { Column, Entity, Index } from 'typeorm'

import type { AssetTransferStatus } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// Zimmet devri (custody transfer) — the barcode handshake. The holder initiates a
// `pending` transfer with a random `token` (rendered as a QR); the receiver scans
// it (resolves by token) and accepts ("Devraldım"), moving custody. `token` is in
// REDACTED_AUDIT_FIELDS so it never lands in an audit diff.
@Entity('inventory_asset_transfers')
export class AssetTransfer extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  assetId!: string

  @Index()
  @Column({ default: 'pending' })
  status!: AssetTransferStatus

  @Column({ type: 'uuid', nullable: true })
  fromEmployeeId!: string | null

  @Column({ type: 'varchar', nullable: true })
  fromEmployeeName!: string | null

  @Column({ type: 'uuid', nullable: true })
  toEmployeeId!: string | null

  @Column({ type: 'varchar', nullable: true })
  toEmployeeName!: string | null

  @Column({ type: 'uuid', nullable: true })
  acceptedByEmployeeId!: string | null

  @Column({ type: 'varchar', nullable: true })
  acceptedByEmployeeName!: string | null

  @Column({ type: 'uuid', nullable: true })
  initiatedById!: string | null

  @Column({ type: 'varchar', nullable: true })
  initiatedByName!: string | null

  @Index({ unique: true })
  @Column()
  token!: string

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null
}
