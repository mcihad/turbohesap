import { Column, Entity, Index } from 'typeorm'

import type { FeedbackPriority, FeedbackStatus, FeedbackType } from '@turbohesap/shared'

import { BaseEntity } from '../../../common/entities/base.entity'

// A piece of in-app feedback (istek/talep/öneri/hata). The optional annotated
// screenshot is stored via the files module and referenced by screenshotFileId.
@Entity('feedback')
export class Feedback extends BaseEntity {
  @Column({ default: 'request' })
  type!: FeedbackType

  @Column({ default: '' })
  title!: string

  @Column({ type: 'text' })
  message!: string

  @Index()
  @Column({ default: 'new' })
  status!: FeedbackStatus

  @Column({ default: 'normal' })
  priority!: FeedbackPriority

  @Column({ type: 'text', nullable: true })
  pageUrl!: string | null

  @Column({ type: 'uuid', nullable: true })
  screenshotFileId!: string | null

  @Index()
  @Column({ type: 'uuid' })
  createdById!: string
}
