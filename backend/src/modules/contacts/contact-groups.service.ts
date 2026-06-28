import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type { ContactGroupDto } from '@turbohesap/shared'

import { Contact } from './entities/contact.entity'
import { ContactGroup } from './entities/contact-group.entity'
import type {
  CreateContactGroupDto,
  UpdateContactGroupDto,
} from './dto/contact-group.dto'

@Injectable()
export class ContactGroupsService {
  constructor(
    @InjectRepository(ContactGroup) private readonly groups: Repository<ContactGroup>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
  ) {}

  async list(): Promise<ContactGroupDto[]> {
    const rows = await this.groups.find({ order: { name: 'ASC' } })
    const counts = await this.contacts
      .createQueryBuilder('c')
      .select('c.groupId', 'gid')
      .addSelect('COUNT(*)', 'cnt')
      .where('c.groupId IS NOT NULL')
      .groupBy('c.groupId')
      .getRawMany<{ gid: string; cnt: string }>()
    const m = new Map<string, number>()
    for (const r of counts) m.set(r.gid, Number(r.cnt))
    return rows.map((g) => toContactGroupDto(g, m.get(g.id) ?? 0))
  }

  async get(id: string): Promise<ContactGroupDto> {
    const group = await this.findOrFail(id)
    const contactCount = await this.contacts.count({ where: { groupId: id } })
    return toContactGroupDto(group, contactCount)
  }

  async create(dto: CreateContactGroupDto): Promise<ContactGroupDto> {
    if (dto.parentId) {
      if (!(await this.groups.findOne({ where: { id: dto.parentId } }))) {
        throw new BadRequestException('Üst grup bulunamadı')
      }
    }
    const group = this.groups.create({
      name: dto.name.trim(),
      parentId: dto.parentId ?? null,
      code: dto.code ?? '',
      isActive: dto.isActive ?? true,
    })
    const saved = await this.groups.save(group)
    return this.get(saved.id)
  }

  async update(id: string, dto: UpdateContactGroupDto): Promise<ContactGroupDto> {
    const group = await this.findOrFail(id)
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('Bir grup kendisinin alt grubu olamaz')
    }
    Object.assign(group, {
      ...dto,
      name: dto.name?.trim() ?? group.name,
    })
    await this.groups.save(group)
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    const group = await this.findOrFail(id)
    const childCount = await this.groups.count({ where: { parentId: id } })
    if (childCount > 0) {
      throw new BadRequestException('Alt grupları olan grup silinemez')
    }
    const contactCount = await this.contacts.count({ where: { groupId: id } })
    if (contactCount > 0) {
      throw new BadRequestException('Bu gruba bağlı cariler var, silinemez')
    }
    await this.groups.remove(group)
  }

  private async findOrFail(id: string): Promise<ContactGroup> {
    const group = await this.groups.findOne({ where: { id } })
    if (!group) throw new NotFoundException('Cari grubu bulunamadı')
    return group
  }
}

export function toContactGroupDto(g: ContactGroup, contactCount = 0): ContactGroupDto {
  return {
    id: g.id,
    parentId: g.parentId,
    name: g.name,
    code: g.code,
    isActive: g.isActive,
    contactCount,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }
}
