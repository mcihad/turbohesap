import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'

import type { BranchDto } from '@turbohesap/shared'

import { Branch } from './entities/branch.entity'
import type { CreateBranchDto } from './dto/create-branch.dto'
import type { UpdateBranchDto } from './dto/update-branch.dto'

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
  ) {}

  async list(): Promise<BranchDto[]> {
    const rows = await this.branches.find({ order: { name: 'ASC' } })
    return rows.map(toBranchDto)
  }

  async get(id: string): Promise<BranchDto> {
    return toBranchDto(await this.findOrFail(id))
  }

  async create(dto: CreateBranchDto): Promise<BranchDto> {
    const exists = await this.branches.findOne({ where: { code: dto.code } })
    if (exists) throw new BadRequestException('Bu şube kodu zaten kullanımda')

    const { openingDate, ...rest } = dto
    const branch = this.branches.create({
      ...rest,
      openingDate: openingDate ? new Date(openingDate) : null,
    })
    const saved = await this.branches.save(branch)
    return toBranchDto(saved)
  }

  async update(id: string, dto: UpdateBranchDto): Promise<BranchDto> {
    const branch = await this.findOrFail(id)
    if (dto.code && dto.code !== branch.code) {
      const clash = await this.branches.findOne({
        where: { code: dto.code, id: Not(id) },
      })
      if (clash) throw new BadRequestException('Bu şube kodu zaten kullanımda')
    }
    const { openingDate, ...rest } = dto
    Object.assign(branch, rest)
    if (openingDate !== undefined) {
      branch.openingDate = openingDate ? new Date(openingDate) : null
    }
    const saved = await this.branches.save(branch)
    return toBranchDto(saved)
  }

  async remove(id: string): Promise<void> {
    const branch = await this.findOrFail(id)
    await this.branches.remove(branch)
  }

  private async findOrFail(id: string): Promise<Branch> {
    const branch = await this.branches.findOne({ where: { id } })
    if (!branch) throw new NotFoundException('Şube bulunamadı')
    return branch
  }
}

export function toBranchDto(b: Branch): BranchDto {
  return {
    id: b.id,
    code: b.code,
    name: b.name,
    type: b.type,
    description: b.description,
    isActive: b.isActive,
    phone: b.phone,
    secondaryPhone: b.secondaryPhone,
    fax: b.fax,
    email: b.email,
    website: b.website,
    country: b.country,
    city: b.city,
    district: b.district,
    neighborhood: b.neighborhood,
    addressLine: b.addressLine,
    postalCode: b.postalCode,
    latitude: b.latitude,
    longitude: b.longitude,
    managerName: b.managerName,
    managerTitle: b.managerTitle,
    managerPhone: b.managerPhone,
    managerEmail: b.managerEmail,
    taxOffice: b.taxOffice,
    taxNumber: b.taxNumber,
    openingDate: b.openingDate ? b.openingDate.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }
}
