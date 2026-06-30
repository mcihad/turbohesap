import {
  Injectable,
  NotFoundException,
  type OnApplicationBootstrap,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type {
  CardSourceDto,
  EmployeeCardDto,
  EmployeeCardListQuery,
} from '@turbohesap/shared'

import { Employee } from './entities/employee.entity'
import { CardSource } from './entities/card-source.entity'
import { EmployeeCard } from './entities/employee-card.entity'
import type {
  CreateCardSourceDto,
  CreateEmployeeCardDto,
  UpdateCardSourceDto,
  UpdateEmployeeCardDto,
} from './dto/card.dto'
import {
  employeeDisplayName,
  employeeNameMap,
  toCardSourceDto,
  toEmployeeCardDto,
} from './hr-pdks.mappers'

@Injectable()
export class CardSourcesService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(CardSource) private readonly sources: Repository<CardSource>,
    @InjectRepository(EmployeeCard) private readonly cards: Repository<EmployeeCard>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  // Seed a default generic source so the import endpoint works out of the box.
  async onApplicationBootstrap(): Promise<void> {
    if ((await this.sources.count()) === 0) {
      await this.sources.save(
        this.sources.create({
          name: 'Genel Kart Sistemi',
          code: 'generic',
          kind: 'generic',
          description: 'Vendor-bağımsız varsayılan kart kaynağı (içe aktarma standardı).',
          config: {},
          timezone: 'Europe/Istanbul',
          directionMapping: {},
          isActive: true,
        }),
      )
    }
  }

  // ── card sources ──────────────────────────────────────────────────────────────

  async list(): Promise<CardSourceDto[]> {
    const rows = await this.sources
      .createQueryBuilder('s')
      .addSelect('s.apiKey')
      .orderBy('s.name', 'ASC')
      .getMany()
    return rows.map((s) => toCardSourceDto(s, !!s.apiKey))
  }

  async get(id: string): Promise<CardSourceDto> {
    const s = await this.findSourceWithKey(id)
    return toCardSourceDto(s, !!s.apiKey)
  }

  async create(dto: CreateCardSourceDto): Promise<CardSourceDto> {
    const s = this.sources.create({
      name: dto.name.trim(),
      code: dto.code ?? '',
      kind: dto.kind ?? 'generic',
      description: dto.description ?? null,
      config: dto.config ?? {},
      timezone: dto.timezone ?? 'Europe/Istanbul',
      directionMapping: dto.directionMapping ?? {},
      apiKey: dto.apiKey?.trim() || null,
      isActive: dto.isActive ?? true,
    })
    const saved = await this.sources.save(s)
    return toCardSourceDto(saved, !!saved.apiKey)
  }

  async update(id: string, dto: UpdateCardSourceDto): Promise<CardSourceDto> {
    // Load WITH the secret so save() preserves it unless explicitly changed.
    const s = await this.findSourceWithKey(id)
    if (dto.name !== undefined) s.name = dto.name.trim()
    if (dto.code !== undefined) s.code = dto.code
    if (dto.kind !== undefined) s.kind = dto.kind
    if (dto.description !== undefined) s.description = dto.description ?? null
    if (dto.config !== undefined) s.config = dto.config
    if (dto.timezone !== undefined) s.timezone = dto.timezone
    if (dto.directionMapping !== undefined) s.directionMapping = dto.directionMapping
    if (dto.isActive !== undefined) s.isActive = dto.isActive
    // Only overwrite the secret when a non-empty value is supplied.
    if (dto.apiKey !== undefined && dto.apiKey.trim()) s.apiKey = dto.apiKey.trim()
    const saved = await this.sources.save(s)
    return toCardSourceDto(saved, !!saved.apiKey)
  }

  async remove(id: string): Promise<void> {
    await this.findSource(id)
    await this.sources.delete({ id })
  }

  // ── employee cards ──────────────────────────────────────────────────────────

  async listCards(query: EmployeeCardListQuery = {}): Promise<EmployeeCardDto[]> {
    const where: Record<string, unknown> = {}
    if (query.employeeId) where.employeeId = query.employeeId
    if (query.cardNo) where.cardNo = query.cardNo
    const rows = await this.cards.find({ where, order: { createdAt: 'DESC' } })
    const names = await employeeNameMap(this.employees, rows.map((r) => r.employeeId))
    return rows.map((r) => toEmployeeCardDto(r, names.get(r.employeeId) ?? '—'))
  }

  async createCard(dto: CreateEmployeeCardDto): Promise<EmployeeCardDto> {
    const emp = await this.employees.findOne({ where: { id: dto.employeeId } })
    if (!emp) throw new NotFoundException('Personel bulunamadı')
    const card = this.cards.create({
      employeeId: dto.employeeId,
      cardNo: dto.cardNo.trim(),
      externalPersonnelId: dto.externalPersonnelId ?? null,
      validFrom: dto.validFrom ?? null,
      validTo: dto.validTo ?? null,
      isActive: dto.isActive ?? true,
    })
    return toEmployeeCardDto(await this.cards.save(card), employeeDisplayName(emp))
  }

  async updateCard(id: string, dto: UpdateEmployeeCardDto): Promise<EmployeeCardDto> {
    const card = await this.cards.findOne({ where: { id } })
    if (!card) throw new NotFoundException('Kart bulunamadı')
    if (dto.cardNo !== undefined) card.cardNo = dto.cardNo.trim()
    if (dto.externalPersonnelId !== undefined) card.externalPersonnelId = dto.externalPersonnelId ?? null
    if (dto.validFrom !== undefined) card.validFrom = dto.validFrom ?? null
    if (dto.validTo !== undefined) card.validTo = dto.validTo ?? null
    if (dto.isActive !== undefined) card.isActive = dto.isActive
    const saved = await this.cards.save(card)
    const emp = await this.employees.findOne({ where: { id: saved.employeeId }, select: { id: true, firstName: true, lastName: true } })
    return toEmployeeCardDto(saved, emp ? employeeDisplayName(emp) : '—')
  }

  async removeCard(id: string): Promise<void> {
    const card = await this.cards.findOne({ where: { id } })
    if (!card) throw new NotFoundException('Kart bulunamadı')
    await this.cards.remove(card)
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private async findSource(id: string): Promise<CardSource> {
    const s = await this.sources.findOne({ where: { id } })
    if (!s) throw new NotFoundException('Kart kaynağı bulunamadı')
    return s
  }

  private async findSourceWithKey(id: string): Promise<CardSource> {
    const s = await this.sources.createQueryBuilder('s').addSelect('s.apiKey').where('s.id = :id', { id }).getOne()
    if (!s) throw new NotFoundException('Kart kaynağı bulunamadı')
    return s
  }
}
