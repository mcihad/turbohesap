import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type {
  ProductModifierGroupDto,
  ProductModifierOptionDto,
} from '@turbohesap/shared'

import { ProductModifierGroup } from './entities/product-modifier-group.entity'
import { ProductModifierOption } from './entities/product-modifier-option.entity'
import { ProductModifierLink } from './entities/product-modifier-link.entity'
import { Product } from './entities/product.entity'
import type {
  CreateModifierGroupDto,
  CreateModifierOptionDto,
  SetProductModifiersDto,
  UpdateModifierGroupDto,
  UpdateModifierOptionDto,
} from './dto/product-modifier.dto'

@Injectable()
export class ProductModifiersService {
  constructor(
    @InjectRepository(ProductModifierGroup) private readonly groups: Repository<ProductModifierGroup>,
    @InjectRepository(ProductModifierOption) private readonly options: Repository<ProductModifierOption>,
    @InjectRepository(ProductModifierLink) private readonly links: Repository<ProductModifierLink>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async listGroups(): Promise<ProductModifierGroupDto[]> {
    const groups = await this.groups.find({ order: { sortOrder: 'ASC', name: 'ASC' } })
    if (groups.length === 0) return []
    const ids = groups.map((g) => g.id)
    const [options, links] = await Promise.all([
      this.options.find({ where: { groupId: In(ids) }, order: { sortOrder: 'ASC' } }),
      this.links.find({ where: { groupId: In(ids) } }),
    ])
    const counts = new Map<string, number>()
    for (const l of links) counts.set(l.groupId, (counts.get(l.groupId) ?? 0) + 1)
    return groups.map((g) =>
      toGroupDto(g, options.filter((o) => o.groupId === g.id), counts.get(g.id) ?? 0),
    )
  }

  async getGroup(id: string): Promise<ProductModifierGroupDto> {
    const g = await this.groupOrFail(id)
    const [options, count] = await Promise.all([
      this.options.find({ where: { groupId: id }, order: { sortOrder: 'ASC' } }),
      this.links.count({ where: { groupId: id } }),
    ])
    return toGroupDto(g, options, count)
  }

  async createGroup(dto: CreateModifierGroupDto): Promise<ProductModifierGroupDto> {
    const group = await this.groups.save(
      this.groups.create({
        name: dto.name.trim(),
        selectionType: dto.selectionType ?? 'single',
        required: dto.required ?? false,
        minSelect: dto.minSelect ?? 0,
        maxSelect: dto.maxSelect ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      }),
    )
    if (dto.options?.length) {
      await this.options.save(
        dto.options.map((o, i) =>
          this.options.create({
            groupId: group.id,
            name: o.name.trim(),
            priceDelta: o.priceDelta ?? 0,
            isDefault: o.isDefault ?? false,
            sortOrder: o.sortOrder ?? i,
            isActive: o.isActive ?? true,
            stockProductId: o.stockProductId ?? null,
            stockVariantId: o.stockVariantId ?? null,
            consumeQty: o.consumeQty ?? 1,
            deductStock: o.deductStock ?? true,
            returnable: o.returnable ?? true,
          }),
        ),
      )
    }
    return this.getGroup(group.id)
  }

  async updateGroup(id: string, dto: UpdateModifierGroupDto): Promise<ProductModifierGroupDto> {
    const g = await this.groupOrFail(id)
    if (dto.name !== undefined) g.name = dto.name.trim()
    if (dto.selectionType !== undefined) g.selectionType = dto.selectionType
    if (dto.required !== undefined) g.required = dto.required
    if (dto.minSelect !== undefined) g.minSelect = dto.minSelect
    if (dto.maxSelect !== undefined) g.maxSelect = dto.maxSelect
    if (dto.sortOrder !== undefined) g.sortOrder = dto.sortOrder
    if (dto.isActive !== undefined) g.isActive = dto.isActive
    await this.groups.save(g)
    return this.getGroup(id)
  }

  async removeGroup(id: string): Promise<void> {
    await this.groupOrFail(id)
    await this.options.delete({ groupId: id })
    await this.links.delete({ groupId: id })
    await this.groups.delete({ id })
  }

  async addOption(groupId: string, dto: CreateModifierOptionDto): Promise<ProductModifierOptionDto> {
    await this.groupOrFail(groupId)
    const count = await this.options.count({ where: { groupId } })
    const saved = await this.options.save(
      this.options.create({
        groupId,
        name: dto.name.trim(),
        priceDelta: dto.priceDelta ?? 0,
        isDefault: dto.isDefault ?? false,
        sortOrder: dto.sortOrder ?? count,
        isActive: dto.isActive ?? true,
        stockProductId: dto.stockProductId ?? null,
        stockVariantId: dto.stockVariantId ?? null,
        consumeQty: dto.consumeQty ?? 1,
        deductStock: dto.deductStock ?? true,
        returnable: dto.returnable ?? true,
      }),
    )
    return toOptionDto(saved)
  }

  async updateOption(
    groupId: string,
    optionId: string,
    dto: UpdateModifierOptionDto,
  ): Promise<ProductModifierOptionDto> {
    const o = await this.options.findOne({ where: { id: optionId, groupId } })
    if (!o) throw new NotFoundException('Seçenek bulunamadı')
    if (dto.name !== undefined) o.name = dto.name.trim()
    if (dto.priceDelta !== undefined) o.priceDelta = dto.priceDelta
    if (dto.isDefault !== undefined) o.isDefault = dto.isDefault
    if (dto.sortOrder !== undefined) o.sortOrder = dto.sortOrder
    if (dto.isActive !== undefined) o.isActive = dto.isActive
    if (dto.stockProductId !== undefined) o.stockProductId = dto.stockProductId ?? null
    if (dto.stockVariantId !== undefined) o.stockVariantId = dto.stockVariantId ?? null
    if (dto.consumeQty !== undefined) o.consumeQty = dto.consumeQty
    if (dto.deductStock !== undefined) o.deductStock = dto.deductStock
    if (dto.returnable !== undefined) o.returnable = dto.returnable
    return toOptionDto(await this.options.save(o))
  }

  async removeOption(groupId: string, optionId: string): Promise<void> {
    const o = await this.options.findOne({ where: { id: optionId, groupId } })
    if (!o) throw new NotFoundException('Seçenek bulunamadı')
    await this.options.delete({ id: optionId })
  }

  /** productId → ordered group ids, for products that have ≥1 modifier group. */
  async productMap(): Promise<Record<string, string[]>> {
    const links = await this.links.find({ order: { sortOrder: 'ASC' } })
    const map: Record<string, string[]> = {}
    for (const l of links) {
      ;(map[l.productId] ??= []).push(l.groupId)
    }
    return map
  }

  async listForProduct(productId: string): Promise<ProductModifierGroupDto[]> {
    const links = await this.links.find({
      where: { productId },
      order: { sortOrder: 'ASC' },
    })
    if (links.length === 0) return []
    const groupIds = links.map((l) => l.groupId)
    const [groups, options] = await Promise.all([
      this.groups.find({ where: { id: In(groupIds) } }),
      this.options.find({ where: { groupId: In(groupIds) }, order: { sortOrder: 'ASC' } }),
    ])
    const groupMap = new Map(groups.map((g) => [g.id, g]))
    // preserve link order
    return links
      .map((l) => groupMap.get(l.groupId))
      .filter((g): g is ProductModifierGroup => !!g)
      .map((g) => toGroupDto(g, options.filter((o) => o.groupId === g.id), 0))
  }

  async setForProduct(productId: string, dto: SetProductModifiersDto): Promise<ProductModifierGroupDto[]> {
    if (!(await this.products.findOne({ where: { id: productId } }))) {
      throw new NotFoundException('Ürün bulunamadı')
    }
    const ids = dto.groupIds ?? []
    if (ids.length) {
      const found = await this.groups.count({ where: { id: In(ids) } })
      if (found !== new Set(ids).size) throw new BadRequestException('Geçersiz modifier grubu')
    }
    await this.links.delete({ productId })
    if (ids.length) {
      await this.links.save(ids.map((groupId, i) => this.links.create({ productId, groupId, sortOrder: i })))
    }
    return this.listForProduct(productId)
  }

  private async groupOrFail(id: string): Promise<ProductModifierGroup> {
    const g = await this.groups.findOne({ where: { id } })
    if (!g) throw new NotFoundException('Modifier grubu bulunamadı')
    return g
  }
}

export function toOptionDto(o: ProductModifierOption): ProductModifierOptionDto {
  return {
    id: o.id,
    groupId: o.groupId,
    name: o.name,
    priceDelta: o.priceDelta,
    isDefault: o.isDefault,
    sortOrder: o.sortOrder,
    isActive: o.isActive,
    stockProductId: o.stockProductId ?? null,
    stockVariantId: o.stockVariantId ?? null,
    consumeQty: o.consumeQty ?? 1,
    deductStock: o.deductStock ?? true,
    returnable: o.returnable ?? true,
  }
}

export function toGroupDto(
  g: ProductModifierGroup,
  options: ProductModifierOption[],
  productCount: number,
): ProductModifierGroupDto {
  return {
    id: g.id,
    name: g.name,
    selectionType: g.selectionType,
    required: g.required,
    minSelect: g.minSelect,
    maxSelect: g.maxSelect,
    sortOrder: g.sortOrder,
    isActive: g.isActive,
    options: options.map(toOptionDto),
    productCount,
  }
}
