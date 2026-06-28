import type {
  CreatePipelineRequest,
  CreatePipelineStageRequest,
  PipelineDto,
  PipelineStageDto,
  ReorderStagesRequest,
  UpdatePipelineRequest,
  UpdatePipelineStageRequest,
} from './pipeline.dto'

export interface IPipelinesService {
  list(): Promise<PipelineDto[]>
  get(id: string): Promise<PipelineDto>
  create(input: CreatePipelineRequest): Promise<PipelineDto>
  update(id: string, input: UpdatePipelineRequest): Promise<PipelineDto>
  remove(id: string): Promise<void>
  addStage(pipelineId: string, input: CreatePipelineStageRequest): Promise<PipelineStageDto>
  updateStage(
    pipelineId: string,
    stageId: string,
    input: UpdatePipelineStageRequest,
  ): Promise<PipelineStageDto>
  removeStage(pipelineId: string, stageId: string): Promise<void>
  reorderStages(pipelineId: string, input: ReorderStagesRequest): Promise<PipelineDto>
}
