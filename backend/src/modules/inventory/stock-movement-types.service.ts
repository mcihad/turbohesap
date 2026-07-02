import {
  BadRequestException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type {
  CreateStockMovementTypeRequest,
  MovementDirection,
  StockMovementTypeDto,
  UpdateStockMovementTypeRequest,
} from '@turbohesap/shared'

import { StockMovementType } from './entities/stock-movement-type.entity'
import { StockMovement } from './entities/stock-movement.entity'

// Default movement types seeded on first boot. The two marked used-by-invoice are
// referenced by name from InvoicesService.
const DEFAULTS: { name: string; direction: MovementDirection; isSystem: boolean }[] = [
  { name: 'Devir Girişi', direction: 'in', isSystem: true },
  { name: 'Satın Alma Girişi', direction: 'in', isSystem: true },
  { name: 'Satış Çıkışı', direction: 'out', isSystem: true },
  { name: 'Sayım Fazlası', direction: 'in', isSystem: false },
  { name: 'Sayım Eksiği', direction: 'out', isSystem: false },
  { name: 'Fire / Zayi', direction: 'out', isSystem: false },
  { name: 'Manuel Giriş', direction: 'in', isSystem: false },
  { name: 'Manuel Çıkış', direction: 'out', isSystem: false },
  // Üretim (manufacturing) — consumed/produced via StockMovementsService.
  { name: 'Üretime Sarf', direction: 'out', isSystem: true },
  { name: 'Üretimden Giriş', direction: 'in', isSystem: true },
  { name: 'Fason Sevk', direction: 'out', isSystem: true },
  { name: 'Fason Giriş', direction: 'in', isSystem: true },
  // Reçete (recipe) — a sold menu item's ingredients backflushed at sale.
  { name: 'Reçete Sarf', direction: 'out', isSystem: true },
]

@Injectable()
export class StockMovementTypesService implements OnModuleInit {
  constructor(
    @InjectRepository(StockMovementType) private readonly types: Repository<StockMovementType>,
    @InjectRepository(StockMovement) private readonly movements: Repository<StockMovement>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const d of DEFAULTS) {
      const existing = await this.types.findOne({ where: { name: d.name } })
      if (!existing) await this.types.save(this.types.create({ ...d, isActive: true }))
    }
  }

  async list(): Promise<StockMovementTypeDto[]> {
    const rows = await this.types.find({ order: { direction: 'ASC', name: 'ASC' } })
    return rows.map(toMovementTypeDto)
  }

  async create(dto: CreateStockMovementTypeRequest): Promise<StockMovementTypeDto> {
    const type = this.types.create({
      name: dto.name.trim(),
      direction: dto.direction,
      isActive: dto.isActive ?? true,
      isSystem: false,
    })
    return toMovementTypeDto(await this.types.save(type))
  }

  async update(id: string, dto: UpdateStockMovementTypeRequest): Promise<StockMovementTypeDto> {
    const type = await this.findOrFail(id)
    if (dto.name !== undefined) type.name = dto.name.trim()
    if (dto.direction !== undefined) type.direction = dto.direction
    if (dto.isActive !== undefined) type.isActive = dto.isActive
    return toMovementTypeDto(await this.types.save(type))
  }

  async remove(id: string): Promise<void> {
    const type = await this.findOrFail(id)
    if (type.isSystem) throw new BadRequestException('Sistem hareket tipi silinemez')
    const used = await this.movements.count({ where: { movementTypeId: id } })
    if (used > 0) throw new BadRequestException('Bu tip ile hareket kaydı var, silinemez (pasife alın)')
    await this.types.remove(type)
  }

  /** Resolve a system type id by name (seeding it if missing) — used by invoices. */
  async systemTypeId(name: string, direction: MovementDirection): Promise<string> {
    let type = await this.types.findOne({ where: { name } })
    if (!type) type = await this.types.save(this.types.create({ name, direction, isActive: true, isSystem: true }))
    return type.id
  }

  private async findOrFail(id: string): Promise<StockMovementType> {
    const type = await this.types.findOne({ where: { id } })
    if (!type) throw new NotFoundException('Hareket tipi bulunamadı')
    return type
  }
}

export function toMovementTypeDto(t: StockMovementType): StockMovementTypeDto {
  return {
    id: t.id,
    name: t.name,
    direction: t.direction,
    isActive: t.isActive,
    isSystem: t.isSystem,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}
