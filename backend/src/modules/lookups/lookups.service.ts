import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type { LookupItemDto, LookupListInfo } from '@turbohesap/shared'

import { LookupItem } from './entities/lookup-item.entity'
import type { CreateLookupItemDto } from './dto/create-lookup-item.dto'
import type { UpdateLookupItemDto } from './dto/update-lookup-item.dto'

@Injectable()
export class LookupsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LookupsService.name)

  constructor(
    @InjectRepository(LookupItem)
    private readonly items: Repository<LookupItem>,
  ) {}

  async list(list?: string): Promise<LookupItemDto[]> {
    const rows = await this.items.find({
      where: list ? { list } : {},
      order: { list: 'ASC', sortOrder: 'ASC', value: 'ASC' },
    })
    return rows.map(toLookupItemDto)
  }

  async lists(): Promise<LookupListInfo[]> {
    const rows = await this.items
      .createQueryBuilder('i')
      .select('i.list', 'list')
      .addSelect('COUNT(*)', 'count')
      .groupBy('i.list')
      .orderBy('i.list', 'ASC')
      .getRawMany<{ list: string; count: string }>()
    return rows.map((r) => ({ list: r.list, count: Number(r.count) }))
  }

  async get(id: string): Promise<LookupItemDto> {
    return toLookupItemDto(await this.findOrFail(id))
  }

  async create(dto: CreateLookupItemDto): Promise<LookupItemDto> {
    const list = dto.list.trim()
    const value = dto.value.trim()
    const key = await this.resolveKey(list, dto.key?.trim() || slugify(value), !dto.key)
    const item = this.items.create({
      list,
      key,
      value,
      sortOrder: dto.sortOrder ?? (await this.nextSortOrder(list)),
      isActive: dto.isActive ?? true,
    })
    return toLookupItemDto(await this.items.save(item))
  }

  async update(id: string, dto: UpdateLookupItemDto): Promise<LookupItemDto> {
    const item = await this.findOrFail(id)
    const nextList = dto.list?.trim() ?? item.list
    if (dto.key !== undefined || dto.list !== undefined) {
      const nextKey = dto.key?.trim() || item.key
      if (nextKey !== item.key || nextList !== item.list) {
        const clash = await this.items.findOne({
          where: { list: nextList, key: nextKey },
        })
        if (clash && clash.id !== id) {
          throw new BadRequestException('Bu listede aynı anahtar zaten var')
        }
      }
      item.key = nextKey
    }
    item.list = nextList
    if (dto.value !== undefined) item.value = dto.value.trim()
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder
    if (dto.isActive !== undefined) item.isActive = dto.isActive
    return toLookupItemDto(await this.items.save(item))
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOrFail(id)
    await this.items.remove(item)
  }

  // Seed a default "birim" (unit) list on first boot so the feature is usable
  // out of the box. Idempotent: skipped once the list has any items.
  async onApplicationBootstrap(): Promise<void> {
    const count = await this.items.count({ where: { list: 'birim' } })
    if (count > 0) return
    const units: Array<[string, string]> = [
      ['ADET', 'Adet'],
      ['KG', 'Kilogram'],
      ['GR', 'Gram'],
      ['LT', 'Litre'],
      ['MT', 'Metre'],
      ['M2', 'Metrekare'],
      ['PAKET', 'Paket'],
      ['KUTU', 'Kutu'],
    ]
    await this.items.save(
      units.map(([key, value], i) =>
        this.items.create({ list: 'birim', key, value, sortOrder: i }),
      ),
    )
    this.logger.log(`Varsayılan "birim" listesi eklendi (${units.length} öğe)`)
  }

  private async findOrFail(id: string): Promise<LookupItem> {
    const item = await this.items.findOne({ where: { id } })
    if (!item) throw new NotFoundException('Liste öğesi bulunamadı')
    return item
  }

  private async nextSortOrder(list: string): Promise<number> {
    const last = await this.items.findOne({
      where: { list },
      order: { sortOrder: 'DESC' },
    })
    return last ? last.sortOrder + 1 : 0
  }

  // Ensure (list, key) is unique. For an explicit key, clash is an error; for a
  // derived key, suffix it (_2, _3, …) so quick-add from the select never fails.
  private async resolveKey(
    list: string,
    candidate: string,
    autoUniquify: boolean,
  ): Promise<string> {
    const base = candidate || 'OGE'
    let key = base
    let n = 2
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const clash = await this.items.findOne({ where: { list, key } })
      if (!clash) return key
      if (!autoUniquify) {
        throw new BadRequestException('Bu listede aynı anahtar zaten var')
      }
      key = `${base}_${n++}`
    }
  }
}

export function toLookupItemDto(i: LookupItem): LookupItemDto {
  return {
    id: i.id,
    list: i.list,
    key: i.key,
    value: i.value,
    sortOrder: i.sortOrder,
    isActive: i.isActive,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }
}

// Turkish-aware slug → an UPPERCASE ASCII code suitable for a stable key.
function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o',
    ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  }
  return value
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}
