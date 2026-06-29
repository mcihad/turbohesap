import type {
  CreateFeedbackRequest,
  FeedbackDto,
  FeedbackListQuery,
  UpdateFeedbackRequest,
} from './feedback.dto'

// Contract for the feedback resource (/api/feedback).
export interface IFeedbackService {
  list(query?: FeedbackListQuery): Promise<FeedbackDto[]>
  get(id: string): Promise<FeedbackDto>
  create(input: CreateFeedbackRequest): Promise<FeedbackDto>
  update(id: string, input: UpdateFeedbackRequest): Promise<FeedbackDto>
  remove(id: string): Promise<void>
}
