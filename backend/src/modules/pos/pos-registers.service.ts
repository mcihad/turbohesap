import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import {
  DEFAULT_REGISTER_SETTINGS,
  type PosRegisterDto,
} from '@turbohesap/shared'

import { PosRegister } from './entities/pos-register.entity'
import { PosSession } from './entities/pos-session.entity'
import { Branch } from '../org/entities/branch.entity'
import { SalesChannel } from '../sales/entities/sales-channel.entity'
import type { CreatePosRegisterDto, UpdatePosRegisterDto } from './dto/pos.dto'

@Injectable()
export class PosRegistersService {
  constructor(
    @InjectRepository(PosRegister) private readonly registers: Repository<PosRegister>,
    @InjectRepository(PosSession) private readonly sessions: Repository<PosSession>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(SalesChannel) private readonly channels: Repository<SalesChannel>,
  ) {}

  async list(): Promise<PosRegisterDto[]> {
    const rows = await this.registers.find({ order: { name: 'ASC' } })
    if (rows.length === 0) return []
    const branchIds = [...new Set(rows.map((r) => r.branchId))]
    const channelIds = [...new Set(rows.map((r) => r.salesChannelId).filter((x): x is string => !!x))]
    const [branches, channels, openSessions] = await Promise.all([
      this.branches.find({ where: { id: In(branchIds) } }),
      channelIds.length ? this.channels.find({ where: { id: In(channelIds) } }) : Promise.resolve([]),
      this.sessions.find({ where: { registerId: In(rows.map((r) => r.id)), status: 'open' } }),
    ])
    const bMap = new Map(branches.map((b) => [b.id, b]))
    const cMap = new Map(channels.map((c) => [c.id, c]))
    const sMap = new Map(openSessions.map((s) => [s.registerId, s.id]))
    return rows.map((r) =>
      toRegisterDto(r, bMap.get(r.branchId) ?? null, r.salesChannelId ? cMap.get(r.salesChannelId) ?? null : null, sMap.get(r.id) ?? null),
    )
  }

  async get(id: string): Promise<PosRegisterDto> {
    const r = await this.findOrFail(id)
    const [branch, channel, open] = await Promise.all([
      this.branches.findOne({ where: { id: r.branchId } }),
      r.salesChannelId ? this.channels.findOne({ where: { id: r.salesChannelId } }) : Promise.resolve(null),
      this.sessions.findOne({ where: { registerId: id, status: 'open' } }),
    ])
    return toRegisterDto(r, branch, channel, open?.id ?? null)
  }

  async create(dto: CreatePosRegisterDto): Promise<PosRegisterDto> {
    if (!(await this.branches.findOne({ where: { id: dto.branchId } }))) {
      throw new BadRequestException('Geçersiz şube')
    }
    const code = (dto.code?.trim() || (await this.nextCode())).trim()
    if (await this.registers.findOne({ where: { code } })) {
      throw new BadRequestException('Bu kasa kodu zaten kullanımda')
    }
    const saved = await this.registers.save(
      this.registers.create({
        name: dto.name.trim(),
        code,
        branchId: dto.branchId,
        salesChannelId: dto.salesChannelId ?? null,
        defaultCashAccountId: dto.defaultCashAccountId ?? null,
        settings: dto.settings ?? {},
        isActive: dto.isActive ?? true,
      }),
    )
    return this.get(saved.id)
  }

  async update(id: string, dto: UpdatePosRegisterDto): Promise<PosRegisterDto> {
    const r = await this.findOrFail(id)
    if (dto.name !== undefined) r.name = dto.name.trim()
    if (dto.code !== undefined && dto.code.trim() && dto.code.trim() !== r.code) {
      const clash = await this.registers.findOne({ where: { code: dto.code.trim() } })
      if (clash && clash.id !== id) throw new BadRequestException('Bu kasa kodu zaten kullanımda')
      r.code = dto.code.trim()
    }
    if (dto.branchId !== undefined) r.branchId = dto.branchId
    if (dto.salesChannelId !== undefined) r.salesChannelId = dto.salesChannelId
    if (dto.defaultCashAccountId !== undefined) r.defaultCashAccountId = dto.defaultCashAccountId
    if (dto.settings !== undefined) r.settings = { ...r.settings, ...dto.settings }
    if (dto.isActive !== undefined) r.isActive = dto.isActive
    await this.registers.save(r)
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    await this.findOrFail(id)
    if (await this.sessions.count({ where: { registerId: id, status: 'open' } })) {
      throw new BadRequestException('Açık vardiyası olan kasa silinemez')
    }
    await this.registers.delete({ id })
  }

  private async nextCode(): Promise<string> {
    const count = await this.registers.count()
    return `POS-${String(count + 1).padStart(2, '0')}`
  }

  private async findOrFail(id: string): Promise<PosRegister> {
    const r = await this.registers.findOne({ where: { id } })
    if (!r) throw new NotFoundException('Kasa bulunamadı')
    return r
  }
}

export function toRegisterDto(
  r: PosRegister,
  branch: Branch | null,
  channel: SalesChannel | null,
  openSessionId: string | null,
): PosRegisterDto {
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    branchId: r.branchId,
    branch: branch ? { id: branch.id, code: branch.code, name: branch.name, city: branch.city } : null,
    salesChannelId: r.salesChannelId,
    salesChannel: channel ? { id: channel.id, name: channel.name } : null,
    defaultCashAccountId: r.defaultCashAccountId,
    settings: { ...DEFAULT_REGISTER_SETTINGS, ...r.settings },
    isActive: r.isActive,
    openSessionId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}
