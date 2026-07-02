import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type { DocumentCategoryDto, DocumentFieldDef } from '@turbohesap/shared'

import { AccessService } from '../iam/access.service'
import { User } from '../iam/entities/user.entity'
import { DocumentCategory } from './entities/document-category.entity'
import { Document } from './entities/document.entity'
import type { CreateDocumentCategoryDto } from './dto/create-document-category.dto'
import type { UpdateDocumentCategoryDto } from './dto/update-document-category.dto'
import { hasPrivateReadAll, privacyChangeNeedsManage, requirePrivateManage } from './privacy.util'
import { ownerNameMap } from './user-name.util'

// Mirrors `inventory/categories.service.ts` (adjacency-list tree, cycle guard,
// delete-with-children guard, unlink-not-cascade on delete) plus **real,
// server-enforced privacy**: a category marked `isPrivate` is invisible to
// everyone except its `ownerId` and callers holding
// `documents.private.readAll` — enforced in the query itself, not a UX filter.
@Injectable()
export class DocumentCategoriesService {
  constructor(
    @InjectRepository(DocumentCategory)
    private readonly categories: Repository<DocumentCategory>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly access: AccessService,
  ) {}

  async list(userId: string): Promise<DocumentCategoryDto[]> {
    const canSeeAllPrivate = await hasPrivateReadAll(this.access, userId)
    const qb = this.categories.createQueryBuilder('c')
    if (!canSeeAllPrivate) {
      qb.andWhere('(c.isPrivate = false OR c.ownerId = :userId)', { userId })
    }
    qb.orderBy('c.sortOrder', 'ASC').addOrderBy('c.name', 'ASC')
    const rows = await qb.getMany()
    if (rows.length === 0) return []

    const [counts, ownerMap] = await Promise.all([
      this.documentCounts(),
      ownerNameMap(this.users, rows.map((r) => r.ownerId)),
    ])
    return rows.map((r) =>
      toCategoryDto(r, counts.get(r.id) ?? 0, r.ownerId ? ownerMap.get(r.ownerId) ?? null : null),
    )
  }

  async get(id: string, userId: string): Promise<DocumentCategoryDto> {
    const c = await this.findVisibleOrFail(id, userId)
    const [count, ownerMap] = await Promise.all([
      this.documents.count({ where: { categoryId: id } }),
      ownerNameMap(this.users, [c.ownerId]),
    ])
    return toCategoryDto(c, count, c.ownerId ? ownerMap.get(c.ownerId) ?? null : null)
  }

  async create(dto: CreateDocumentCategoryDto, userId: string): Promise<DocumentCategoryDto> {
    if (dto.parentId) await this.findOrFail(dto.parentId)
    if (dto.ownerId != null && dto.ownerId !== userId) {
      await requirePrivateManage(this.access, userId)
    }
    const category = this.categories.create({
      name: dto.name.trim(),
      parentId: dto.parentId ?? null,
      code: dto.code ?? '',
      description: dto.description ?? '',
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      isPrivate: dto.isPrivate ?? false,
      ownerId: dto.ownerId ?? (dto.isPrivate ? userId : null),
      fieldDefs: normalizeFieldDefs(dto.fieldDefs),
    })
    const saved = await this.categories.save(category)
    return this.get(saved.id, userId)
  }

  async update(
    id: string,
    dto: UpdateDocumentCategoryDto,
    userId: string,
  ): Promise<DocumentCategoryDto> {
    const category = await this.findVisibleOrFail(id, userId)

    if (dto.isPrivate !== undefined || dto.ownerId !== undefined) {
      if (privacyChangeNeedsManage(category.ownerId, dto.ownerId, userId)) {
        await requirePrivateManage(this.access, userId)
      }
    }

    if (dto.parentId !== undefined) {
      const nextParent = dto.parentId ?? null
      if (nextParent === id) {
        throw new BadRequestException('Bir kategori kendisinin alt kategorisi olamaz')
      }
      if (nextParent) {
        await this.findOrFail(nextParent)
        if (await this.isDescendant(nextParent, id)) {
          throw new BadRequestException(
            'Bir kategori, kendi alt ağacındaki bir kategoriye taşınamaz',
          )
        }
      }
      category.parentId = nextParent
    }

    if (dto.name !== undefined) category.name = dto.name.trim()
    if (dto.code !== undefined) category.code = dto.code
    if (dto.description !== undefined) category.description = dto.description
    if (dto.isActive !== undefined) category.isActive = dto.isActive
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder
    if (dto.isPrivate !== undefined) category.isPrivate = dto.isPrivate
    if (dto.ownerId !== undefined) category.ownerId = dto.ownerId
    if (dto.fieldDefs !== undefined) category.fieldDefs = normalizeFieldDefs(dto.fieldDefs)

    await this.categories.save(category)
    return this.get(id, userId)
  }

  async remove(id: string, userId: string): Promise<void> {
    const category = await this.findVisibleOrFail(id, userId)
    const childCount = await this.categories.count({ where: { parentId: id } })
    if (childCount > 0) {
      throw new BadRequestException(
        'Alt kategorileri olan bir kategori silinemez. Önce alt kategorileri taşıyın veya silin.',
      )
    }
    // Unlink any documents in this category (keep them, drop the dangling ref).
    await this.documents.update({ categoryId: id }, { categoryId: null })
    await this.categories.remove(category)
  }

  // --- Helpers -------------------------------------------------------------

  private async documentCounts(): Promise<Map<string, number>> {
    const rows = await this.documents
      .createQueryBuilder('d')
      .select('d.categoryId', 'cid')
      .addSelect('COUNT(*)', 'cnt')
      .where('d.categoryId IS NOT NULL')
      .groupBy('d.categoryId')
      .getRawMany<{ cid: string; cnt: string }>()
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.cid, Number(r.cnt))
    return m
  }

  /** True if `candidateAncestor` lies on the path from `nodeId` up to the root. */
  private async isDescendant(candidateAncestor: string, nodeId: string): Promise<boolean> {
    let current: string | null = candidateAncestor
    const guard = new Set<string>()
    while (current) {
      if (current === nodeId) return true
      if (guard.has(current)) break
      guard.add(current)
      const parent: DocumentCategory | null = await this.categories.findOne({
        where: { id: current },
        select: { id: true, parentId: true },
      })
      current = parent?.parentId ?? null
    }
    return false
  }

  private async findOrFail(id: string): Promise<DocumentCategory> {
    const category = await this.categories.findOne({ where: { id } })
    if (!category) throw new NotFoundException('Kategori bulunamadı')
    return category
  }

  // 404 (not 403) on a private row you can't see — existence isn't leaked.
  private async findVisibleOrFail(id: string, userId: string): Promise<DocumentCategory> {
    const category = await this.findOrFail(id)
    if (
      category.isPrivate &&
      category.ownerId !== userId &&
      !(await hasPrivateReadAll(this.access, userId))
    ) {
      throw new NotFoundException('Kategori bulunamadı')
    }
    return category
  }
}

function normalizeFieldDefs(defs?: DocumentFieldDef[]): DocumentFieldDef[] {
  return (defs ?? []).map((d, i) => ({
    ...d,
    key: d.key.trim(),
    sortOrder: d.sortOrder ?? i,
  }))
}

function toCategoryDto(
  c: DocumentCategory,
  documentCount: number,
  ownerName: string | null,
): DocumentCategoryDto {
  return {
    id: c.id,
    parentId: c.parentId,
    name: c.name,
    code: c.code,
    description: c.description,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
    isPrivate: c.isPrivate,
    ownerId: c.ownerId,
    ownerName,
    documentCount,
    fieldDefs: (c.fieldDefs ?? []).slice().sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    ),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}
