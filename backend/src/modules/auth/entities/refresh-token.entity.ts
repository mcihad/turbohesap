import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

// A persisted refresh token, enabling rotation and revocation. The row id is the
// JWT `jti`; the refresh JWT only carries that id (+ sub), so a token is valid
// only while its row exists, is not revoked, and has not expired.
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Index()
  @Column('uuid')
  userId!: string

  @Column({ type: 'timestamptz' })
  expiresAt!: Date

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null

  // The id of the token that replaced this one (rotation trail).
  @Column({ type: 'uuid', nullable: true })
  replacedById!: string | null

  @CreateDateColumn()
  createdAt!: Date
}
