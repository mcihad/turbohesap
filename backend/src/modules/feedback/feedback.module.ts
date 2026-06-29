import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Feedback } from './entities/feedback.entity'
import { FileEntity } from '../files/entities/file.entity'
import { User } from '../iam/entities/user.entity'
import { FeedbackController } from './feedback.controller'
import { FeedbackService } from './feedback.service'

// In-app feedback (istek/talep/öneri/hata). Reuses the files module's polymorphic
// File rows for the annotated screenshot (read/attach only) and User for names.
@Module({
  imports: [TypeOrmModule.forFeature([Feedback, FileEntity, User])],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
