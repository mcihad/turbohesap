import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'

import type { SalesChannelDto } from '@turbohesap/shared'

import { SalesChannel } from './entities/sales-channel.entity'
import type { CreateSalesChannelDto } from './dto/create-sales-channel.dto'
import type { UpdateSalesChannelDto } from './dto/update-sales-channel.dto'

@Injectable()
export class SalesChannelsService {
  constructor(
    @InjectRepository(SalesChannel)
    private readonly channels: Repository<SalesChannel>,
  ) {}

  async list(): Promise<SalesChannelDto[]> {
    const rows = await this.channels.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    })
    return rows.map(toSalesChannelDto)
  }

  async get(id: string): Promise<SalesChannelDto> {
    return toSalesChannelDto(await this.findOrFail(id))
  }

  async create(dto: CreateSalesChannelDto): Promise<SalesChannelDto> {
    const exists = await this.channels.findOne({ where: { code: dto.code } })
    if (exists) throw new BadRequestException('Bu kod zaten kullanımda')

    const channel = this.channels.create({ ...dto })
    if (dto.isDefault) await this.clearDefault()
    const saved = await this.channels.save(channel)
    return toSalesChannelDto(saved)
  }

  async update(
    id: string,
    dto: UpdateSalesChannelDto,
  ): Promise<SalesChannelDto> {
    const channel = await this.findOrFail(id)
    if (dto.code && dto.code !== channel.code) {
      const clash = await this.channels.findOne({
        where: { code: dto.code, id: Not(id) },
      })
      if (clash) throw new BadRequestException('Bu kod zaten kullanımda')
    }
    if (dto.isDefault) await this.clearDefault(id)
    Object.assign(channel, dto)
    const saved = await this.channels.save(channel)
    return toSalesChannelDto(saved)
  }

  async remove(id: string): Promise<void> {
    const channel = await this.findOrFail(id)
    await this.channels.remove(channel)
  }

  private async findOrFail(id: string): Promise<SalesChannel> {
    const channel = await this.channels.findOne({ where: { id } })
    if (!channel) throw new NotFoundException('Satış kanalı bulunamadı')
    return channel
  }

  // Only one channel may be the default — clear the flag on all others.
  private async clearDefault(exceptId?: string): Promise<void> {
    await this.channels.update(
      exceptId ? { isDefault: true, id: Not(exceptId) } : { isDefault: true },
      { isDefault: false },
    )
  }
}

export function toSalesChannelDto(c: SalesChannel): SalesChannelDto {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    description: c.description,
    isActive: c.isActive,
    isDefault: c.isDefault,
    sortOrder: c.sortOrder,
    commissionRate: c.commissionRate,
    currency: c.currency,
    website: c.website,
    contactName: c.contactName,
    contactTitle: c.contactTitle,
    contactPhone: c.contactPhone,
    contactEmail: c.contactEmail,
    country: c.country,
    city: c.city,
    district: c.district,
    addressLine: c.addressLine,
    postalCode: c.postalCode,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}
