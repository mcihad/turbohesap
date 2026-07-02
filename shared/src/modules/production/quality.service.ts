import type {
  QualityCheckDto,
  QualityCheckListQuery,
  RecordQualityCheckRequest,
} from './quality.dto'

export interface IQualityChecksService {
  list(query?: QualityCheckListQuery): Promise<QualityCheckDto[]>
  get(id: string): Promise<QualityCheckDto>
  record(input: RecordQualityCheckRequest): Promise<QualityCheckDto>
}
