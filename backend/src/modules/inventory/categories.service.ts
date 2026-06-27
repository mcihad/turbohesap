import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type {
  CategoryDto,
  CategoryFieldDef,
  CategorySummary,
} from '@turbohesap/shared'

import { Category } from './entities/category.entity'
import { Product } from './entities/product.entity'
import type { CreateCategoryDto } from './dto/create-category.dto'
import type { UpdateCategoryDto } from './dto/update-category.dto'

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async list(): Promise<CategoryDto[]> {
    const rows = await this.categories.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    })
    const counts = await this.productCounts()
    return rows.map((r) => toCategoryDto(r, counts.get(r.id) ?? 0))
  }

  async get(id: string): Promise<CategoryDto> {
    const c = await this.findOrFail(id)
    return toCategoryDto(c, await this.products.count({ where: { categoryId: id } }))
  }

  // Direct product count per category (one grouped query).
  private async productCounts(): Promise<Map<string, number>> {
    const rows = await this.products
      .createQueryBuilder('p')
      .select('p.categoryId', 'cid')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.categoryId IS NOT NULL')
      .groupBy('p.categoryId')
      .getRawMany<{ cid: string; cnt: string }>()
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.cid, Number(r.cnt))
    return m
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDto> {
    if (dto.parentId) await this.findOrFail(dto.parentId)
    const category = this.categories.create({
      name: dto.name.trim(),
      parentId: dto.parentId ?? null,
      code: dto.code ?? '',
      description: dto.description ?? '',
      imageUrl: dto.imageUrl ?? '',
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      fieldDefs: normalizeFieldDefs(dto.fieldDefs),
    })
    return toCategoryDto(await this.categories.save(category))
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    const category = await this.findOrFail(id)

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
    if (dto.imageUrl !== undefined) category.imageUrl = dto.imageUrl
    if (dto.isActive !== undefined) category.isActive = dto.isActive
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder
    if (dto.fieldDefs !== undefined) {
      category.fieldDefs = normalizeFieldDefs(dto.fieldDefs)
    }

    const saved = await this.categories.save(category)
    return toCategoryDto(saved, await this.products.count({ where: { categoryId: id } }))
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOrFail(id)
    const childCount = await this.categories.count({ where: { parentId: id } })
    if (childCount > 0) {
      throw new BadRequestException(
        'Alt kategorileri olan bir kategori silinemez. Önce alt kategorileri taşıyın veya silin.',
      )
    }
    // Unlink any products in this category (keep them, drop the dangling ref).
    await this.products.update({ categoryId: id }, { categoryId: null })
    await this.categories.remove(category)
  }

  /** True if `candidateAncestor` lies on the path from `nodeId` up to the root —
   *  i.e. moving a node under `candidateAncestor` would create a cycle. */
  private async isDescendant(
    candidateAncestor: string,
    nodeId: string,
  ): Promise<boolean> {
    // Walk up from candidateAncestor; if we reach nodeId, it's inside nodeId's subtree.
    let current: string | null = candidateAncestor
    const guard = new Set<string>()
    while (current) {
      if (current === nodeId) return true
      if (guard.has(current)) break // safety against pre-existing cycles
      guard.add(current)
      const parent: Category | null = await this.categories.findOne({
        where: { id: current },
        select: { id: true, parentId: true },
      })
      current = parent?.parentId ?? null
    }
    return false
  }

  private async findOrFail(id: string): Promise<Category> {
    const category = await this.categories.findOne({ where: { id } })
    if (!category) throw new NotFoundException('Kategori bulunamadı')
    return category
  }
}

function normalizeFieldDefs(defs?: CategoryFieldDef[]): CategoryFieldDef[] {
  return (defs ?? []).map((d, i) => ({
    ...d,
    key: d.key.trim(),
    sortOrder: d.sortOrder ?? i,
  }))
}

export function toCategoryDto(c: Category, productCount = 0): CategoryDto {
  return {
    id: c.id,
    parentId: c.parentId,
    name: c.name,
    code: c.code,
    description: c.description,
    imageUrl: c.imageUrl,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
    productCount,
    fieldDefs: (c.fieldDefs ?? []).slice().sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    ),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export function toCategorySummary(c: Category): CategorySummary {
  return { id: c.id, parentId: c.parentId, name: c.name, code: c.code }
}
