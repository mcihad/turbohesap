import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { ReorderRuleDto, ReorderRuleListQuery } from '@turbohesap/shared'

import { Product } from '../inventory/entities/product.entity'
import { ReorderRule } from './entities/reorder-rule.entity'
import type { CreateReorderRuleDto, UpdateReorderRuleDto } from './dto/planning.dto'

@Injectable()
export class ReorderRulesService {
  constructor(
    @InjectRepository(ReorderRule) private readonly rules: Repository<ReorderRule>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async list(query: ReorderRuleListQuery = {}): Promise<ReorderRuleDto[]> {
    const where: Record<string, unknown> = {}
    if (query.productId) where.productId = query.productId
    if (query.branchId) where.branchId = query.branchId
    if (query.isActive !== undefined) where.isActive = query.isActive
    const rows = await this.rules.find({ where, order: { createdAt: 'DESC' } })
    return this.enrich(rows)
  }

  async create(dto: CreateReorderRuleDto): Promise<ReorderRuleDto> {
    if (!(await this.products.exists({ where: { id: dto.productId } }))) throw new NotFoundException('Ürün bulunamadı')
    if (dto.maxQty < dto.minQty) throw new BadRequestException('Maksimum, minimumdan küçük olamaz')
    const rule = this.rules.create({
      productId: dto.productId,
      variantId: dto.variantId ?? null,
      branchId: dto.branchId ?? null,
      minQty: dto.minQty,
      maxQty: dto.maxQty,
      isActive: dto.isActive ?? true,
    })
    return (await this.enrich([await this.rules.save(rule)]))[0]
  }

  async update(id: string, dto: UpdateReorderRuleDto): Promise<ReorderRuleDto> {
    const rule = await this.findOrFail(id)
    if (dto.variantId !== undefined) rule.variantId = dto.variantId ?? null
    if (dto.branchId !== undefined) rule.branchId = dto.branchId ?? null
    if (dto.minQty !== undefined) rule.minQty = dto.minQty
    if (dto.maxQty !== undefined) rule.maxQty = dto.maxQty
    if (dto.isActive !== undefined) rule.isActive = dto.isActive
    if (rule.maxQty < rule.minQty) throw new BadRequestException('Maksimum, minimumdan küçük olamaz')
    return (await this.enrich([await this.rules.save(rule)]))[0]
  }

  async remove(id: string): Promise<void> {
    await this.findOrFail(id)
    await this.rules.delete({ id })
  }

  private async enrich(rows: ReorderRule[]): Promise<ReorderRuleDto[]> {
    if (rows.length === 0) return []
    const ids = [...new Set(rows.map((r) => r.productId))]
    const products = new Map<string, { name: string; code: string }>()
    const prod = await this.products.find({ where: { id: In(ids) }, select: { id: true, name: true, code: true } })
    for (const p of prod) products.set(p.id, { name: p.name, code: p.code })
    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      variantId: r.variantId,
      productName: products.get(r.productId)?.name ?? '',
      productCode: products.get(r.productId)?.code ?? '',
      branchId: r.branchId,
      minQty: r.minQty,
      maxQty: r.maxQty,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  }

  private async findOrFail(id: string): Promise<ReorderRule> {
    const r = await this.rules.findOne({ where: { id } })
    if (!r) throw new NotFoundException('Reorder kuralı bulunamadı')
    return r
  }
}
