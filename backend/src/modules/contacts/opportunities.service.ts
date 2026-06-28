import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import {
  type BulkOpportunityRequest,
  type BulkResultDto,
  type CloseOpportunityRequest,
  type OpportunityDto,
  type OpportunityListQuery,
} from '@turbohesap/shared'

import { Activity } from './entities/activity.entity'
import { Contact } from './entities/contact.entity'
import { Opportunity } from './entities/opportunity.entity'
import { Pipeline } from './entities/pipeline.entity'
import { PipelineStage } from './entities/pipeline-stage.entity'
import { User } from '../iam/entities/user.entity'
import { NotificationsService } from './notifications.service'
import { ownerNameMap } from './user-name.util'
import type {
  CreateOpportunityDto,
  MoveOpportunityDto,
  UpdateOpportunityDto,
} from './dto/opportunity.dto'

const DAY_MS = 86_400_000

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(Opportunity) private readonly opportunities: Repository<Opportunity>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Pipeline) private readonly pipelines: Repository<Pipeline>,
    @InjectRepository(PipelineStage) private readonly stages: Repository<PipelineStage>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  async list(query?: OpportunityListQuery, currentUserId?: string): Promise<OpportunityDto[]> {
    const where: Record<string, unknown> = {}
    if (query?.contactId) where.contactId = query.contactId
    if (query?.pipelineId) where.pipelineId = query.pipelineId
    if (query?.stageId) where.stageId = query.stageId
    else if (query?.stage) where.stage = query.stage
    if (query?.ownerId) where.ownerId = query.ownerId
    else if (query?.mine && currentUserId) where.ownerId = currentUserId

    const rows = await this.opportunities.find({ where, order: { createdAt: 'DESC' } })
    if (rows.length === 0) return []

    let result = rows
    if (query?.openOnly) {
      const stageMap = await this.stageMap(rows.map((r) => r.stageId))
      result = rows.filter((r) => r.stageId && stageMap.get(r.stageId)?.type === 'open')
    }
    if (result.length === 0) return []
    return this.toDtos(result)
  }

  async get(id: string): Promise<OpportunityDto> {
    const o = await this.findOrFail(id)
    return (await this.toDtos([o]))[0]
  }

  async create(dto: CreateOpportunityDto, ownerFallback: string | null): Promise<OpportunityDto> {
    if (!(await this.contacts.findOne({ where: { id: dto.contactId } }))) {
      throw new NotFoundException('Cari bulunamadı')
    }
    const { pipeline, stage } = await this.resolveTarget(dto.pipelineId, dto.stageId, dto.stage)
    const opportunity = this.opportunities.create({
      contactId: dto.contactId,
      contactPersonId: dto.contactPersonId ?? null,
      name: dto.name.trim(),
      pipelineId: pipeline.id,
      stageId: stage.id,
      stage: stage.key as Opportunity['stage'],
      stageEnteredAt: new Date(),
      amount: dto.amount ?? 0,
      currencyCode: dto.currencyCode ?? 'TRY',
      probability: dto.probability ?? stage.probability,
      expectedCloseDate: dto.expectedCloseDate ?? null,
      source: dto.source ?? null,
      ownerId: dto.ownerId ?? ownerFallback,
      notes: dto.notes ?? null,
      attributes: dto.attributes ?? {},
    })
    const saved = await this.opportunities.save(opportunity)
    if (saved.ownerId && saved.ownerId !== ownerFallback) {
      await this.notifications.emit({
        userId: saved.ownerId,
        type: 'assignment',
        title: 'Size bir fırsat atandı',
        body: saved.name,
        entityType: 'Opportunity',
        entityId: saved.id,
      })
    }
    return this.get(saved.id)
  }

  async update(id: string, dto: UpdateOpportunityDto): Promise<OpportunityDto> {
    const o = await this.findOrFail(id)
    if (dto.name !== undefined) o.name = dto.name.trim()
    if (dto.contactPersonId !== undefined) o.contactPersonId = dto.contactPersonId
    if (dto.amount !== undefined) o.amount = dto.amount
    if (dto.currencyCode !== undefined) o.currencyCode = dto.currencyCode
    if (dto.expectedCloseDate !== undefined) o.expectedCloseDate = dto.expectedCloseDate
    if (dto.source !== undefined) o.source = dto.source
    if (dto.ownerId !== undefined) o.ownerId = dto.ownerId
    if (dto.notes !== undefined) o.notes = dto.notes
    if (dto.attributes !== undefined) o.attributes = dto.attributes
    if (dto.stageId !== undefined || dto.stage !== undefined || dto.pipelineId !== undefined) {
      const { pipeline, stage } = await this.resolveTarget(
        dto.pipelineId ?? o.pipelineId ?? undefined,
        dto.stageId,
        dto.stage,
      )
      this.applyStage(o, pipeline.id, stage, dto.probability)
    } else if (dto.probability !== undefined) {
      o.probability = dto.probability
    }
    await this.opportunities.save(o)
    return this.get(id)
  }

  async move(id: string, dto: MoveOpportunityDto, actor?: string | null): Promise<OpportunityDto> {
    const o = await this.findOrFail(id)
    const stage = await this.stages.findOne({ where: { id: dto.stageId } })
    if (!stage) throw new NotFoundException('Aşama bulunamadı')
    this.applyStage(o, stage.pipelineId, stage)
    await this.opportunities.save(o)
    if (o.ownerId && o.ownerId !== actor) {
      await this.notifications.emit({
        userId: o.ownerId,
        type: 'stage_change',
        title: 'Fırsat aşaması değişti',
        body: `${o.name} → ${stage.name}`,
        entityType: 'Opportunity',
        entityId: o.id,
      })
    }
    return this.get(id)
  }

  async close(id: string, dto: CloseOpportunityRequest): Promise<OpportunityDto> {
    const o = await this.findOrFail(id)
    if (!o.pipelineId) throw new BadRequestException('Fırsatın satış hattı yok')
    const target = await this.stages.findOne({
      where: { pipelineId: o.pipelineId, type: dto.result },
      order: { sortOrder: 'ASC' },
    })
    if (!target) {
      throw new BadRequestException(`Bu satış hattında '${dto.result}' tipinde aşama yok`)
    }
    this.applyStage(o, o.pipelineId, target)
    if (dto.result === 'won') o.winReason = dto.reason ?? null
    else o.lossReason = dto.reason ?? null
    await this.opportunities.save(o)
    return this.get(id)
  }

  async bulk(dto: BulkOpportunityRequest): Promise<BulkResultDto> {
    if (!dto.ids?.length) return { updated: 0 }
    const rows = await this.opportunities.find({ where: { id: In(dto.ids) } })
    if (dto.op === 'assignOwner') {
      for (const o of rows) o.ownerId = dto.value || null
      await this.opportunities.save(rows)
    } else if (dto.op === 'move' && dto.value) {
      const stage = await this.stages.findOne({ where: { id: dto.value } })
      if (stage) {
        for (const o of rows) this.applyStage(o, stage.pipelineId, stage)
        await this.opportunities.save(rows)
      }
    }
    return { updated: rows.length }
  }

  async remove(id: string): Promise<void> {
    const o = await this.findOrFail(id)
    await this.opportunities.remove(o)
  }

  // ── helpers ──
  private applyStage(
    o: Opportunity,
    pipelineId: string,
    stage: PipelineStage,
    probabilityOverride?: number,
  ): void {
    o.pipelineId = pipelineId
    o.stageId = stage.id
    o.stage = stage.key as Opportunity['stage']
    o.stageEnteredAt = new Date()
    o.probability = probabilityOverride ?? stage.probability
  }

  /** Resolve the target pipeline + stage from optional pipelineId/stageId/legacy key. */
  private async resolveTarget(
    pipelineId?: string,
    stageId?: string,
    stageKey?: string,
  ): Promise<{ pipeline: Pipeline; stage: PipelineStage }> {
    if (stageId) {
      const stage = await this.stages.findOne({ where: { id: stageId } })
      if (!stage) throw new NotFoundException('Aşama bulunamadı')
      const pipeline = await this.pipelines.findOne({ where: { id: stage.pipelineId } })
      if (!pipeline) throw new NotFoundException('Satış hattı bulunamadı')
      return { pipeline, stage }
    }
    const pipeline = pipelineId
      ? await this.pipelines.findOne({ where: { id: pipelineId } })
      : await this.defaultPipeline()
    if (!pipeline) throw new NotFoundException('Satış hattı bulunamadı')
    const stagesOf = await this.stages.find({
      where: { pipelineId: pipeline.id },
      order: { sortOrder: 'ASC' },
    })
    if (stagesOf.length === 0) throw new BadRequestException('Satış hattının aşaması yok')
    const stage =
      (stageKey && stagesOf.find((s) => s.key === stageKey)) ||
      stagesOf.find((s) => s.type === 'open') ||
      stagesOf[0]
    return { pipeline, stage }
  }

  private async defaultPipeline(): Promise<Pipeline | null> {
    return (
      (await this.pipelines.findOne({ where: { isDefault: true } })) ??
      (await this.pipelines.findOne({ where: {}, order: { sortOrder: 'ASC' } }))
    )
  }

  private async stageMap(ids: Array<string | null>): Promise<Map<string, PipelineStage>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))]
    const m = new Map<string, PipelineStage>()
    if (unique.length === 0) return m
    for (const s of await this.stages.find({ where: { id: In(unique) } })) m.set(s.id, s)
    return m
  }

  private async lastActivityMap(ids: string[]): Promise<Map<string, Date>> {
    const m = new Map<string, Date>()
    if (ids.length === 0) return m
    const rows = await this.activities
      .createQueryBuilder('a')
      .select('a.opportunityId', 'opportunityId')
      .addSelect('MAX(a.createdAt)', 'last')
      .where('a.opportunityId IN (:...ids)', { ids })
      .groupBy('a.opportunityId')
      .getRawMany<{ opportunityId: string; last: string }>()
    for (const r of rows) if (r.opportunityId) m.set(r.opportunityId, new Date(r.last))
    return m
  }

  private async toDtos(rows: Opportunity[]): Promise<OpportunityDto[]> {
    const [stageMap, lastMap, contactMap, ownerMap] = await Promise.all([
      this.stageMap(rows.map((r) => r.stageId)),
      this.lastActivityMap(rows.map((r) => r.id)),
      this.contactNameMap(rows.map((r) => r.contactId)),
      ownerNameMap(this.users, rows.map((r) => r.ownerId)),
    ])
    const now = Date.now()
    return rows.map((o) =>
      toOpportunityDto(o, {
        contactName: contactMap.get(o.contactId) ?? null,
        ownerName: o.ownerId ? ownerMap.get(o.ownerId) ?? null : null,
        stage: o.stageId ? stageMap.get(o.stageId) ?? null : null,
        lastActivityAt: lastMap.get(o.id) ?? null,
        now,
      }),
    )
  }

  private async contactNameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)]
    const m = new Map<string, string>()
    if (unique.length === 0) return m
    for (const c of await this.contacts.find({ where: { id: In(unique) } })) m.set(c.id, c.name)
    return m
  }

  private async findOrFail(id: string): Promise<Opportunity> {
    const o = await this.opportunities.findOne({ where: { id } })
    if (!o) throw new NotFoundException('Fırsat bulunamadı')
    return o
  }
}

interface DtoCtx {
  contactName: string | null
  ownerName: string | null
  stage: PipelineStage | null
  lastActivityAt: Date | null
  now: number
}

export function toOpportunityDto(o: Opportunity, ctx: DtoCtx): OpportunityDto {
  const stageType = ctx.stage?.type ?? 'open'
  const isClosed = stageType !== 'open'
  const enteredAt = o.stageEnteredAt ?? o.createdAt
  const daysInStage = Math.max(0, Math.floor((ctx.now - enteredAt.getTime()) / DAY_MS))
  const rottingDays = ctx.stage?.rottingDays ?? 0
  const sinceActivity = (ctx.lastActivityAt ?? enteredAt).getTime()
  const isRotting =
    stageType === 'open' && rottingDays > 0 && ctx.now - sinceActivity > rottingDays * DAY_MS
  return {
    id: o.id,
    contactId: o.contactId,
    contact: ctx.contactName ? { id: o.contactId, name: ctx.contactName } : null,
    contactPersonId: o.contactPersonId,
    name: o.name,
    pipelineId: o.pipelineId ?? '',
    stageId: o.stageId ?? '',
    stageKey: ctx.stage?.key ?? o.stage,
    stageName: ctx.stage?.name ?? o.stage,
    stageType,
    stageColor: ctx.stage?.color ?? '#6366f1',
    stage: ctx.stage?.key ?? o.stage,
    amount: o.amount,
    currencyCode: o.currencyCode,
    probability: o.probability,
    expectedRevenue: Math.round(o.amount * (o.probability / 100) * 100) / 100,
    expectedCloseDate: o.expectedCloseDate,
    source: o.source,
    ownerId: o.ownerId,
    owner: o.ownerId && ctx.ownerName ? { id: o.ownerId, name: ctx.ownerName } : null,
    notes: o.notes,
    winReason: o.winReason,
    lossReason: o.lossReason,
    lastActivityAt: ctx.lastActivityAt ? ctx.lastActivityAt.toISOString() : null,
    isRotting,
    daysInStage,
    attributes: o.attributes ?? {},
    isClosed,
    isWon: stageType === 'won',
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }
}
