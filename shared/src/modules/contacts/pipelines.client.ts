import type { AxiosInstance } from 'axios'

import type {
  CreatePipelineRequest,
  CreatePipelineStageRequest,
  PipelineDto,
  PipelineStageDto,
  ReorderStagesRequest,
  UpdatePipelineRequest,
  UpdatePipelineStageRequest,
} from './pipeline.dto'
import type { IPipelinesService } from './pipelines.service'

const base = '/contacts/pipelines'

export class PipelinesApiClient implements IPipelinesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<PipelineDto[]> {
    return (await this.http.get<PipelineDto[]>(base)).data
  }
  async get(id: string): Promise<PipelineDto> {
    return (await this.http.get<PipelineDto>(`${base}/${id}`)).data
  }
  async create(input: CreatePipelineRequest): Promise<PipelineDto> {
    return (await this.http.post<PipelineDto>(base, input)).data
  }
  async update(id: string, input: UpdatePipelineRequest): Promise<PipelineDto> {
    return (await this.http.patch<PipelineDto>(`${base}/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`${base}/${id}`)
  }
  async addStage(pipelineId: string, input: CreatePipelineStageRequest): Promise<PipelineStageDto> {
    return (await this.http.post<PipelineStageDto>(`${base}/${pipelineId}/stages`, input)).data
  }
  async updateStage(
    pipelineId: string,
    stageId: string,
    input: UpdatePipelineStageRequest,
  ): Promise<PipelineStageDto> {
    return (
      await this.http.patch<PipelineStageDto>(`${base}/${pipelineId}/stages/${stageId}`, input)
    ).data
  }
  async removeStage(pipelineId: string, stageId: string): Promise<void> {
    await this.http.delete(`${base}/${pipelineId}/stages/${stageId}`)
  }
  async reorderStages(pipelineId: string, input: ReorderStagesRequest): Promise<PipelineDto> {
    return (
      await this.http.patch<PipelineDto>(`${base}/${pipelineId}/stages/reorder`, input)
    ).data
  }
}
