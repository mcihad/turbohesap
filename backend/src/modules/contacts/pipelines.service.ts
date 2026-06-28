import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import {
  type CreatePipelineStageRequest,
  type PipelineDto,
  type PipelineStageDto,
} from '@turbohesap/shared'

import { Opportunity } from './entities/opportunity.entity'
import { Pipeline } from './entities/pipeline.entity'
import { PipelineStage } from './entities/pipeline-stage.entity'
import type {
  CreatePipelineDto,
  CreatePipelineStageDto,
  ReorderStagesDto,
  UpdatePipelineDto,
  UpdatePipelineStageDto,
} from './dto/pipeline.dto'

// Default stages mirroring the legacy fixed enum — used when a pipeline is
// created without explicit stages.
const DEFAULT_STAGES: CreatePipelineStageRequest[] = [
  { name: 'Ön görüşme', key: 'prospecting', probability: 10, type: 'open', color: '#94a3b8' },
  { name: 'Niteleme', key: 'qualification', probability: 25, type: 'open', color: '#38bdf8' },
  { name: 'Teklif', key: 'proposal', probability: 50, type: 'open', color: '#6366f1' },
  { name: 'Pazarlık', key: 'negotiation', probability: 75, type: 'open', color: '#f59e0b' },
  { name: 'Kazanıldı', key: 'won', probability: 100, type: 'won', color: '#22c55e' },
  { name: 'Kaybedildi', key: 'lost', probability: 0, type: 'lost', color: '#ef4444' },
]

const TR_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
}
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[çğıöşü]/g, (m) => TR_MAP[m] ?? m)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'stage'
}

@Injectable()
export class PipelinesService {
  constructor(
    @InjectRepository(Pipeline) private readonly pipelines: Repository<Pipeline>,
    @InjectRepository(PipelineStage) private readonly stages: Repository<PipelineStage>,
    @InjectRepository(Opportunity) private readonly opportunities: Repository<Opportunity>,
  ) {}

  async list(): Promise<PipelineDto[]> {
    const pipelines = await this.pipelines.find({ order: { sortOrder: 'ASC', name: 'ASC' } })
    if (pipelines.length === 0) return []
    const stages = await this.stages.find({
      where: { pipelineId: In(pipelines.map((p) => p.id)) },
      order: { sortOrder: 'ASC' },
    })
    const byPipeline = new Map<string, PipelineStage[]>()
    for (const s of stages) {
      const arr = byPipeline.get(s.pipelineId) ?? []
      arr.push(s)
      byPipeline.set(s.pipelineId, arr)
    }
    const out: PipelineDto[] = []
    for (const p of pipelines) {
      const st = byPipeline.get(p.id) ?? []
      out.push(toPipelineDto(p, st, await this.openCount(p.id, st)))
    }
    return out
  }

  async get(id: string): Promise<PipelineDto> {
    const p = await this.findOrFail(id)
    const st = await this.stagesOf(id)
    return toPipelineDto(p, st, await this.openCount(id, st))
  }

  async create(dto: CreatePipelineDto): Promise<PipelineDto> {
    const makeDefault = dto.isDefault ?? (await this.pipelines.count()) === 0
    if (makeDefault) await this.pipelines.update({ isDefault: true }, { isDefault: false })
    const pipeline = await this.pipelines.save(
      this.pipelines.create({
        name: dto.name.trim(),
        description: dto.description ?? '',
        isDefault: makeDefault,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      }),
    )
    const stageInputs = dto.stages?.length ? dto.stages : DEFAULT_STAGES
    await this.stages.save(
      stageInputs.map((s, i) => this.buildStage(pipeline.id, s, i)),
    )
    return this.get(pipeline.id)
  }

  async update(id: string, dto: UpdatePipelineDto): Promise<PipelineDto> {
    const p = await this.findOrFail(id)
    if (dto.name !== undefined) p.name = dto.name.trim()
    if (dto.description !== undefined) p.description = dto.description
    if (dto.isActive !== undefined) p.isActive = dto.isActive
    if (dto.sortOrder !== undefined) p.sortOrder = dto.sortOrder
    if (dto.isDefault === true) {
      await this.pipelines.update({ isDefault: true }, { isDefault: false })
      p.isDefault = true
    }
    await this.pipelines.save(p)
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    const p = await this.findOrFail(id)
    if (await this.opportunities.count({ where: { pipelineId: id } })) {
      throw new BadRequestException('Fırsatı olan satış hattı silinemez')
    }
    if (p.isDefault) throw new BadRequestException('Varsayılan satış hattı silinemez')
    await this.stages.delete({ pipelineId: id })
    await this.pipelines.remove(p)
  }

  async addStage(pipelineId: string, dto: CreatePipelineStageDto): Promise<PipelineStageDto> {
    await this.findOrFail(pipelineId)
    const count = await this.stages.count({ where: { pipelineId } })
    const saved = await this.stages.save(this.buildStage(pipelineId, dto, dto.sortOrder ?? count))
    return toStageDto(saved)
  }

  async updateStage(
    pipelineId: string,
    stageId: string,
    dto: UpdatePipelineStageDto,
  ): Promise<PipelineStageDto> {
    const s = await this.stageOrFail(pipelineId, stageId)
    if (dto.name !== undefined) s.name = dto.name.trim()
    if (dto.key !== undefined) s.key = slugify(dto.key)
    if (dto.sortOrder !== undefined) s.sortOrder = dto.sortOrder
    if (dto.probability !== undefined) s.probability = dto.probability
    if (dto.type !== undefined) s.type = dto.type
    if (dto.rottingDays !== undefined) s.rottingDays = dto.rottingDays
    if (dto.color !== undefined) s.color = dto.color
    return toStageDto(await this.stages.save(s))
  }

  async removeStage(pipelineId: string, stageId: string): Promise<void> {
    const s = await this.stageOrFail(pipelineId, stageId)
    if (await this.opportunities.count({ where: { stageId } })) {
      throw new BadRequestException('Fırsatı olan aşama silinemez')
    }
    if ((await this.stages.count({ where: { pipelineId } })) <= 1) {
      throw new BadRequestException('Satış hattında en az bir aşama olmalı')
    }
    await this.stages.remove(s)
  }

  async reorderStages(pipelineId: string, dto: ReorderStagesDto): Promise<PipelineDto> {
    const st = await this.stagesOf(pipelineId)
    const ids = new Set(st.map((s) => s.id))
    let i = 0
    for (const id of dto.stageIds) {
      if (!ids.has(id)) continue
      await this.stages.update({ id }, { sortOrder: i++ })
    }
    return this.get(pipelineId)
  }

  // ── helpers ──
  private buildStage(
    pipelineId: string,
    dto: CreatePipelineStageRequest,
    index: number,
  ): PipelineStage {
    return this.stages.create({
      pipelineId,
      name: dto.name.trim(),
      key: slugify(dto.key || dto.name),
      sortOrder: dto.sortOrder ?? index,
      probability: dto.probability ?? 0,
      type: dto.type ?? 'open',
      rottingDays: dto.rottingDays ?? 0,
      color: dto.color ?? '#6366f1',
    })
  }

  private async openCount(pipelineId: string, stages: PipelineStage[]): Promise<number> {
    const openIds = stages.filter((s) => s.type === 'open').map((s) => s.id)
    if (openIds.length === 0) return 0
    return this.opportunities.count({ where: { pipelineId, stageId: In(openIds) } })
  }

  private async stagesOf(pipelineId: string): Promise<PipelineStage[]> {
    return this.stages.find({ where: { pipelineId }, order: { sortOrder: 'ASC' } })
  }

  private async findOrFail(id: string): Promise<Pipeline> {
    const p = await this.pipelines.findOne({ where: { id } })
    if (!p) throw new NotFoundException('Satış hattı bulunamadı')
    return p
  }

  private async stageOrFail(pipelineId: string, stageId: string): Promise<PipelineStage> {
    const s = await this.stages.findOne({ where: { id: stageId, pipelineId } })
    if (!s) throw new NotFoundException('Aşama bulunamadı')
    return s
  }
}

export function toStageDto(s: PipelineStage): PipelineStageDto {
  return {
    id: s.id,
    pipelineId: s.pipelineId,
    name: s.name,
    key: s.key,
    sortOrder: s.sortOrder,
    probability: s.probability,
    type: s.type,
    rottingDays: s.rottingDays,
    color: s.color,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

export function toPipelineDto(
  p: Pipeline,
  stages: PipelineStage[],
  openOpportunityCount: number,
): PipelineDto {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    isDefault: p.isDefault,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    stages: stages.map(toStageDto),
    openOpportunityCount,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}
