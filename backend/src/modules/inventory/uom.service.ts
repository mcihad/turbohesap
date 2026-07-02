import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import {
  convertUom,
  UomConversionError,
  type CreateUomCategoryRequest,
  type CreateUomRequest,
  type UomCategoryDto,
  type UomConvertRequest,
  type UomConvertResult,
  type UomDto,
  type UpdateUomCategoryRequest,
  type UpdateUomRequest,
} from '@turbohesap/shared'

import { UomCategory } from './entities/uom-category.entity'
import { Uom } from './entities/uom.entity'
import { Product } from './entities/product.entity'

// Default categories + units, mapping the existing `birim` lookup keys so every
// product `unit` resolves to a UoM. Weight/Length/Volume carry real conversions.
const SEED: { cat: string; ref: string; uoms: [string, string, number, number][] }[] = [
  // [code, name, factorToReference, rounding]
  { cat: 'Adet', ref: 'ADET', uoms: [['ADET', 'Adet', 1, 1]] },
  {
    cat: 'Ağırlık',
    ref: 'KG',
    uoms: [
      ['KG', 'Kilogram', 1, 0.0001],
      ['GR', 'Gram', 0.001, 0.0001],
      ['MG', 'Miligram', 0.000001, 0.0001],
      ['TON', 'Ton', 1000, 0.0001],
    ],
  },
  {
    cat: 'Hacim',
    ref: 'LT',
    uoms: [
      ['LT', 'Litre', 1, 0.0001],
      ['ML', 'Mililitre', 0.001, 0.0001],
      ['M3', 'Metreküp', 1000, 0.0001],
    ],
  },
  {
    cat: 'Uzunluk',
    ref: 'MT',
    uoms: [
      ['MT', 'Metre', 1, 0.0001],
      ['CM', 'Santimetre', 0.01, 0.0001],
      ['MM', 'Milimetre', 0.001, 0.0001],
      ['KM', 'Kilometre', 1000, 0.0001],
    ],
  },
  { cat: 'Alan', ref: 'M2', uoms: [['M2', 'Metrekare', 1, 0.0001]] },
  { cat: 'Paket', ref: 'PAKET', uoms: [['PAKET', 'Paket', 1, 1]] },
  { cat: 'Kutu', ref: 'KUTU', uoms: [['KUTU', 'Kutu', 1, 1]] },
]

@Injectable()
export class UomService implements OnModuleInit {
  constructor(
    @InjectRepository(UomCategory) private readonly categories: Repository<UomCategory>,
    @InjectRepository(Uom) private readonly uoms: Repository<Uom>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const c of SEED) {
      let cat = await this.categories.findOne({ where: { name: c.cat } })
      if (!cat) {
        cat = await this.categories.save(
          this.categories.create({ name: c.cat, referenceUomCode: c.ref, isActive: true }),
        )
      }
      for (const [code, name, factor, rounding] of c.uoms) {
        if (await this.uoms.exists({ where: { code } })) continue
        await this.uoms.save(
          this.uoms.create({
            categoryId: cat.id,
            code,
            name,
            factorToReference: factor,
            rounding,
            isReference: code === c.ref,
            isActive: true,
          }),
        )
      }
    }
  }

  // ── categories ───────────────────────────────────────────────────────────────

  async listCategories(): Promise<UomCategoryDto[]> {
    const rows = await this.categories.find({ order: { name: 'ASC' } })
    const counts = await this.uomCounts(rows.map((r) => r.id))
    return rows.map((r) => toCategoryDto(r, counts.get(r.id) ?? 0))
  }

  async createCategory(dto: CreateUomCategoryRequest): Promise<UomCategoryDto> {
    const refCode = dto.referenceUomCode.trim().toUpperCase()
    if (!refCode) throw new BadRequestException('Referans birim kodu gerekli')
    const cat = await this.categories.save(
      this.categories.create({ name: dto.name.trim(), referenceUomCode: refCode, isActive: dto.isActive ?? true }),
    )
    // Ensure the reference unit exists in this category. Fine default rounding so
    // conversions into it aren't truncated (e.g. 1.5 hours stays 1.5, not 2).
    if (!(await this.uoms.exists({ where: { code: refCode } }))) {
      await this.uoms.save(
        this.uoms.create({ categoryId: cat.id, code: refCode, name: refCode, factorToReference: 1, rounding: 0.0001, isReference: true, isActive: true }),
      )
    }
    return toCategoryDto(cat, await this.uoms.count({ where: { categoryId: cat.id } }))
  }

  async updateCategory(id: string, dto: UpdateUomCategoryRequest): Promise<UomCategoryDto> {
    const cat = await this.categoryOrFail(id)
    if (dto.name !== undefined) cat.name = dto.name.trim()
    if (dto.referenceUomCode !== undefined) cat.referenceUomCode = dto.referenceUomCode.trim().toUpperCase()
    if (dto.isActive !== undefined) cat.isActive = dto.isActive
    await this.categories.save(cat)
    return toCategoryDto(cat, await this.uoms.count({ where: { categoryId: id } }))
  }

  async removeCategory(id: string): Promise<void> {
    await this.categoryOrFail(id)
    const codes = (await this.uoms.find({ where: { categoryId: id }, select: { code: true } })).map((u) => u.code)
    if (codes.length && (await this.productsUsing(codes)) > 0) {
      throw new BadRequestException('Bu kategorideki birimler ürünlerde kullanılıyor, silinemez')
    }
    await this.uoms.delete({ categoryId: id })
    await this.categories.delete({ id })
  }

  // ── units ─────────────────────────────────────────────────────────────────────

  async list(categoryId?: string): Promise<UomDto[]> {
    const where = categoryId ? { categoryId } : {}
    const rows = await this.uoms.find({ where, order: { code: 'ASC' } })
    const names = await this.categoryNames(rows.map((r) => r.categoryId))
    return rows.map((r) => toUomDto(r, names.get(r.categoryId) ?? ''))
  }

  async create(dto: CreateUomRequest): Promise<UomDto> {
    const cat = await this.categoryOrFail(dto.categoryId)
    const code = dto.code.trim().toUpperCase()
    if (await this.uoms.exists({ where: { code } })) {
      throw new ConflictException('Bu birim kodu zaten var')
    }
    const uom = this.uoms.create({
      categoryId: cat.id,
      code,
      name: dto.name.trim(),
      factorToReference: dto.factorToReference,
      rounding: dto.rounding ?? 0.0001,
      isReference: dto.isReference ?? false,
      isActive: dto.isActive ?? true,
    })
    return toUomDto(await this.uoms.save(uom), cat.name)
  }

  async update(id: string, dto: UpdateUomRequest): Promise<UomDto> {
    const uom = await this.uomOrFail(id)
    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase()
      if (code !== uom.code && (await this.uoms.exists({ where: { code } }))) {
        throw new ConflictException('Bu birim kodu zaten var')
      }
      uom.code = code
    }
    if (dto.name !== undefined) uom.name = dto.name.trim()
    if (dto.factorToReference !== undefined) uom.factorToReference = dto.factorToReference
    if (dto.rounding !== undefined) uom.rounding = dto.rounding
    if (dto.isReference !== undefined) uom.isReference = dto.isReference
    if (dto.isActive !== undefined) uom.isActive = dto.isActive
    const cat = await this.categoryOrFail(uom.categoryId)
    return toUomDto(await this.uoms.save(uom), cat.name)
  }

  async remove(id: string): Promise<void> {
    const uom = await this.uomOrFail(id)
    if (uom.isReference) throw new BadRequestException('Kategori referans birimi silinemez')
    if ((await this.productsUsing([uom.code])) > 0) {
      throw new BadRequestException('Bu birim ürünlerde kullanılıyor, silinemez')
    }
    await this.uoms.delete({ id })
  }

  async convert(dto: UomConvertRequest): Promise<UomConvertResult> {
    const all = await this.uoms.find()
    try {
      const quantity = convertUom(dto.quantity, dto.fromCode.trim().toUpperCase(), dto.toCode.trim().toUpperCase(), all)
      return { quantity, fromCode: dto.fromCode, toCode: dto.toCode }
    } catch (e) {
      if (e instanceof UomConversionError) throw new BadRequestException(e.message)
      throw e
    }
  }

  // ── internals ────────────────────────────────────────────────────────────────

  private async productsUsing(codes: string[]): Promise<number> {
    if (codes.length === 0) return 0
    return this.products.count({ where: { unit: In(codes) } })
  }

  private async uomCounts(catIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    if (catIds.length === 0) return map
    const rows = await this.uoms
      .createQueryBuilder('u')
      .select('u.category_id', 'cid')
      .addSelect('COUNT(*)', 'cnt')
      .where('u.category_id IN (:...ids)', { ids: catIds })
      .groupBy('u.category_id')
      .getRawMany<{ cid: string; cnt: string }>()
    for (const r of rows) map.set(r.cid, Number(r.cnt))
    return map
  }

  private async categoryNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)]
    const map = new Map<string, string>()
    if (unique.length === 0) return map
    const rows = await this.categories.find({ where: { id: In(unique) }, select: { id: true, name: true } })
    for (const c of rows) map.set(c.id, c.name)
    return map
  }

  private async categoryOrFail(id: string): Promise<UomCategory> {
    const c = await this.categories.findOne({ where: { id } })
    if (!c) throw new NotFoundException('Birim kategorisi bulunamadı')
    return c
  }
  private async uomOrFail(id: string): Promise<Uom> {
    const u = await this.uoms.findOne({ where: { id } })
    if (!u) throw new NotFoundException('Birim bulunamadı')
    return u
  }
}

function toCategoryDto(c: UomCategory, uomCount: number): UomCategoryDto {
  return {
    id: c.id,
    name: c.name,
    referenceUomCode: c.referenceUomCode,
    isActive: c.isActive,
    uomCount,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

function toUomDto(u: Uom, categoryName: string): UomDto {
  return {
    id: u.id,
    categoryId: u.categoryId,
    categoryName,
    code: u.code,
    name: u.name,
    factorToReference: u.factorToReference,
    rounding: u.rounding,
    isReference: u.isReference,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }
}
