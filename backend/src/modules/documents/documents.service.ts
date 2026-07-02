import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import {
  computeExpiryStatus,
  effectiveDocumentFieldDefs,
  missingRequiredDocumentAttributes,
  type DocumentDto,
  type DocumentExpiryStatus,
  type DocumentListQuery,
} from '@turbohesap/shared'

import { FileEntity } from '../files/entities/file.entity'
import { AccessService } from '../iam/access.service'
import { User } from '../iam/entities/user.entity'
import { DocumentCategory } from './entities/document-category.entity'
import { Document } from './entities/document.entity'
import type { CreateDocumentDto } from './dto/create-document.dto'
import type { UpdateDocumentDto } from './dto/update-document.dto'
import { hasPrivateReadAll, privacyChangeNeedsManage, requirePrivateManage } from './privacy.util'
import { ownerNameMap } from './user-name.util'

const FILES_ENTITY_TYPE = 'Document'

// The generic evrak CRUD + tag admin. Privacy is **genuinely enforced** here
// (query-level, not a UX filter) — see `privacy.util.ts`.
@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(DocumentCategory)
    private readonly categories: Repository<DocumentCategory>,
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly access: AccessService,
  ) {}

  async list(query: DocumentListQuery | undefined, userId: string): Promise<DocumentDto[]> {
    const canSeeAllPrivate = await hasPrivateReadAll(this.access, userId)
    const qb = this.documents.createQueryBuilder('d')
    if (!canSeeAllPrivate) {
      qb.andWhere('(d.isPrivate = false OR d.ownerId = :userId)', { userId })
    }
    if (query?.categoryId) qb.andWhere('d.categoryId = :categoryId', { categoryId: query.categoryId })
    if (query?.tag) qb.andWhere('d.tags @> :tag::jsonb', { tag: JSON.stringify([query.tag]) })
    if (query?.isPrivate != null) {
      qb.andWhere('d.isPrivate = :isPrivateFilter', { isPrivateFilter: query.isPrivate })
    }
    if (query?.mine) qb.andWhere('d.ownerId = :userId', { userId })
    if (query?.relatedEntityType) {
      qb.andWhere('d.relatedEntityType = :ret', { ret: query.relatedEntityType })
    }
    if (query?.relatedEntityId) qb.andWhere('d.relatedEntityId = :rei', { rei: query.relatedEntityId })
    if (query?.search) {
      qb.andWhere('(d.title ILIKE :q OR d.description ILIKE :q OR d.code ILIKE :q)', {
        q: `%${query.search}%`,
      })
    }
    qb.orderBy('d.updatedAt', 'DESC')
    const rows = await qb.getMany()
    if (rows.length === 0) return []

    const dtos = await this.toDtos(rows)
    // expiryStatus is computed, not a column — filter in application code.
    return query?.expiryStatus ? dtos.filter((d) => d.expiryStatus === query.expiryStatus) : dtos
  }

  async get(id: string, userId: string): Promise<DocumentDto> {
    const doc = await this.findVisibleOrFail(id, userId)
    return (await this.toDtos([doc]))[0]
  }

  async create(dto: CreateDocumentDto, userId: string): Promise<DocumentDto> {
    const category = dto.categoryId ? await this.requireVisibleCategory(dto.categoryId, userId) : null
    if (dto.ownerId != null && dto.ownerId !== userId) {
      await requirePrivateManage(this.access, userId)
    }

    await this.validateAttributes(dto.categoryId ?? null, dto.attributes ?? {})

    const isPrivate = dto.isPrivate ?? category?.isPrivate ?? false
    const doc = this.documents.create({
      categoryId: dto.categoryId ?? null,
      title: dto.title.trim(),
      code: dto.code ?? '',
      description: dto.description ?? '',
      attributes: dto.attributes ?? {},
      tags: normalizeTags(dto.tags),
      metadata: dto.metadata ?? {},
      ocrText: null,
      ocrStatus: null,
      isTimeBound: dto.isTimeBound ?? false,
      issueDate: dto.issueDate ?? null,
      expiryDate: dto.expiryDate ?? null,
      reminderDaysBefore: dto.reminderDaysBefore ?? null,
      isPrivate,
      ownerId: dto.ownerId ?? (isPrivate ? userId : null),
      relatedEntityType: dto.relatedEntityType ?? null,
      relatedEntityId: dto.relatedEntityId ?? null,
      createdById: userId,
    })
    const saved = await this.documents.save(doc)
    return this.get(saved.id, userId)
  }

  async update(id: string, dto: UpdateDocumentDto, userId: string): Promise<DocumentDto> {
    const doc = await this.findVisibleOrFail(id, userId)

    if (dto.isPrivate !== undefined || dto.ownerId !== undefined) {
      if (privacyChangeNeedsManage(doc.ownerId, dto.ownerId, userId)) {
        await requirePrivateManage(this.access, userId)
      }
    }

    if (dto.categoryId !== undefined && dto.categoryId) {
      await this.requireVisibleCategory(dto.categoryId, userId)
    }

    if (dto.categoryId !== undefined || dto.attributes !== undefined) {
      const nextCategoryId = dto.categoryId !== undefined ? dto.categoryId : doc.categoryId
      const nextAttributes = dto.attributes !== undefined ? dto.attributes : doc.attributes
      await this.validateAttributes(nextCategoryId, nextAttributes ?? {})
    }

    if (dto.categoryId !== undefined) doc.categoryId = dto.categoryId ?? null
    if (dto.title !== undefined) doc.title = dto.title.trim()
    if (dto.code !== undefined) doc.code = dto.code
    if (dto.description !== undefined) doc.description = dto.description
    if (dto.attributes !== undefined) doc.attributes = dto.attributes
    if (dto.tags !== undefined) doc.tags = normalizeTags(dto.tags)
    if (dto.metadata !== undefined) doc.metadata = dto.metadata
    if (dto.isTimeBound !== undefined) doc.isTimeBound = dto.isTimeBound
    if (dto.issueDate !== undefined) doc.issueDate = dto.issueDate ?? null
    if (dto.expiryDate !== undefined) doc.expiryDate = dto.expiryDate ?? null
    if (dto.reminderDaysBefore !== undefined) doc.reminderDaysBefore = dto.reminderDaysBefore ?? null
    if (dto.isPrivate !== undefined) doc.isPrivate = dto.isPrivate
    if (dto.ownerId !== undefined) doc.ownerId = dto.ownerId ?? null
    if (dto.relatedEntityType !== undefined) doc.relatedEntityType = dto.relatedEntityType ?? null
    if (dto.relatedEntityId !== undefined) doc.relatedEntityId = dto.relatedEntityId ?? null

    await this.documents.save(doc)
    return this.get(id, userId)
  }

  async remove(id: string, userId: string): Promise<void> {
    const doc = await this.findVisibleOrFail(id, userId)
    await this.documents.remove(doc)
  }

  // --- Tag admin (documents.tags.manage) ------------------------------------
  // Operates across ALL documents regardless of privacy — a deliberately
  // elevated maintenance action, gated by its own permission at the controller.

  async listDistinctTags(): Promise<string[]> {
    const rows = await this.documents
      .createQueryBuilder('d')
      .select('DISTINCT jsonb_array_elements_text(d.tags)', 'tag')
      .getRawMany<{ tag: string }>()
    return rows.map((r) => r.tag).sort((a, b) => a.localeCompare(b, 'tr'))
  }

  async renameTag(from: string, to: string): Promise<void> {
    const f = from.trim()
    const t = to.trim()
    if (!f || !t) throw new BadRequestException('Etiket adı boş olamaz')
    const rows = await this.documents
      .createQueryBuilder('d')
      .where('d.tags @> :tag::jsonb', { tag: JSON.stringify([f]) })
      .getMany()
    for (const d of rows) {
      d.tags = [...new Set(d.tags.map((tag) => (tag === f ? t : tag)))]
    }
    if (rows.length) await this.documents.save(rows)
  }

  async deleteTag(tag: string): Promise<void> {
    const tg = tag.trim()
    const rows = await this.documents
      .createQueryBuilder('d')
      .where('d.tags @> :tag::jsonb', { tag: JSON.stringify([tg]) })
      .getMany()
    for (const d of rows) d.tags = d.tags.filter((t) => t !== tg)
    if (rows.length) await this.documents.save(rows)
  }

  // --- Helpers ---------------------------------------------------------------

  private async validateAttributes(
    categoryId: string | null,
    attributes: Record<string, unknown>,
  ): Promise<void> {
    if (!categoryId) return
    const nodes = await this.categories.find({
      select: { id: true, parentId: true, name: true, fieldDefs: true },
    })
    const fields = effectiveDocumentFieldDefs(categoryId, nodes)
    const missing = missingRequiredDocumentAttributes(fields, attributes)
    if (missing.length > 0) {
      throw new BadRequestException(`Zorunlu alanlar eksik: ${missing.join(', ')}`)
    }
  }

  // Same "geçersiz kategori" 400 precedent as `inventory/products.service.ts`'s
  // `requireCategory`, plus the privacy check (invisible categories are
  // treated as invalid, not leaked as 403/404).
  private async requireVisibleCategory(
    categoryId: string,
    userId: string,
  ): Promise<DocumentCategory> {
    const category = await this.categories.findOne({ where: { id: categoryId } })
    if (!category) throw new BadRequestException('Geçersiz kategori')
    if (
      category.isPrivate &&
      category.ownerId !== userId &&
      !(await hasPrivateReadAll(this.access, userId))
    ) {
      throw new BadRequestException('Geçersiz kategori')
    }
    return category
  }

  private async findOrFail(id: string): Promise<Document> {
    const doc = await this.documents.findOne({ where: { id } })
    if (!doc) throw new NotFoundException('Evrak bulunamadı')
    return doc
  }

  // 404 (not 403) on a private row you can't see — existence isn't leaked.
  private async findVisibleOrFail(id: string, userId: string): Promise<Document> {
    const doc = await this.findOrFail(id)
    if (
      doc.isPrivate &&
      doc.ownerId !== userId &&
      !(await hasPrivateReadAll(this.access, userId))
    ) {
      throw new NotFoundException('Evrak bulunamadı')
    }
    return doc
  }

  private async toDtos(rows: Document[]): Promise<DocumentDto[]> {
    const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter((x): x is string => !!x))]
    const ids = rows.map((r) => r.id)

    const [categoryMap, ownerMap, createdByMap, fileCountMap] = await Promise.all([
      categoryIds.length
        ? this.categories.find({ where: { id: In(categoryIds) }, select: { id: true, name: true } })
        : Promise.resolve([]),
      ownerNameMap(this.users, rows.map((r) => r.ownerId)),
      ownerNameMap(this.users, rows.map((r) => r.createdById)),
      this.fileCounts(ids),
    ])
    const categoryNameById = new Map(categoryMap.map((c) => [c.id, c.name]))

    return rows.map((d) => toDocumentDto(d, {
      categoryName: d.categoryId ? categoryNameById.get(d.categoryId) ?? null : null,
      ownerName: d.ownerId ? ownerMap.get(d.ownerId) ?? null : null,
      createdByName: d.createdById ? createdByMap.get(d.createdById) ?? null : null,
      fileCount: fileCountMap.get(d.id) ?? 0,
    }))
  }

  private async fileCounts(documentIds: string[]): Promise<Map<string, number>> {
    if (documentIds.length === 0) return new Map()
    const rows = await this.files
      .createQueryBuilder('f')
      .select('f.entityId', 'eid')
      .addSelect('COUNT(*)', 'cnt')
      .where('f.entityType = :et', { et: FILES_ENTITY_TYPE })
      .andWhere('f.entityId IN (:...ids)', { ids: documentIds })
      .groupBy('f.entityId')
      .getRawMany<{ eid: string; cnt: string }>()
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.eid, Number(r.cnt))
    return m
  }
}

function normalizeTags(tags?: string[]): string[] {
  return [...new Set((tags ?? []).map((t) => t.trim()).filter(Boolean))]
}

function toDocumentDto(
  d: Document,
  opts: {
    categoryName: string | null
    ownerName: string | null
    createdByName: string | null
    fileCount: number
  },
): DocumentDto {
  const expiryStatus: DocumentExpiryStatus = computeExpiryStatus(
    d.isTimeBound,
    d.expiryDate,
    d.reminderDaysBefore,
  )
  return {
    id: d.id,
    categoryId: d.categoryId,
    categoryName: opts.categoryName,
    title: d.title,
    code: d.code,
    description: d.description,
    attributes: d.attributes ?? {},
    tags: d.tags ?? [],
    metadata: d.metadata ?? {},
    ocrText: d.ocrText,
    ocrStatus: (d.ocrStatus as DocumentDto['ocrStatus']) ?? null,
    isTimeBound: d.isTimeBound,
    issueDate: d.issueDate,
    expiryDate: d.expiryDate,
    reminderDaysBefore: d.reminderDaysBefore,
    expiryStatus,
    isPrivate: d.isPrivate,
    ownerId: d.ownerId,
    ownerName: opts.ownerName,
    relatedEntityType: d.relatedEntityType,
    relatedEntityId: d.relatedEntityId,
    fileCount: opts.fileCount,
    createdById: d.createdById,
    createdByName: opts.createdByName,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}
