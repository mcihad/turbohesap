import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { CashAccountDto } from '@turbohesap/shared'
import { CashAccount } from './entities/cash-account.entity'
import type { CreateCashAccountDto, UpdateCashAccountDto } from './dto/cash-account.dto'

@Injectable()
export class CashAccountsService {
  constructor(
    @InjectRepository(CashAccount)
    private readonly cashAccounts: Repository<CashAccount>,
  ) {}

  async list(): Promise<CashAccountDto[]> {
    const rows = await this.cashAccounts.find({ order: { name: 'ASC' } })
    return rows.map(toCashAccountDto)
  }

  async get(id: string): Promise<CashAccountDto> {
    return toCashAccountDto(await this.findOrFail(id))
  }

  async create(dto: CreateCashAccountDto): Promise<CashAccountDto> {
    const exists = await this.cashAccounts.findOne({ where: { name: dto.name } })
    if (exists) throw new BadRequestException('Bu kasa ismi zaten kullanımda')

    const cashAccount = this.cashAccounts.create(dto)
    const saved = await this.cashAccounts.save(cashAccount)
    return toCashAccountDto(saved)
  }

  async update(id: string, dto: UpdateCashAccountDto): Promise<CashAccountDto> {
    const cashAccount = await this.findOrFail(id)
    if (dto.name && dto.name !== cashAccount.name) {
      const clash = await this.cashAccounts.findOne({ where: { name: dto.name } })
      if (clash && clash.id !== id) {
        throw new BadRequestException('Bu kasa ismi zaten kullanımda')
      }
    }
    Object.assign(cashAccount, dto)
    const saved = await this.cashAccounts.save(cashAccount)
    return toCashAccountDto(saved)
  }

  async remove(id: string): Promise<void> {
    const cashAccount = await this.findOrFail(id)
    await this.cashAccounts.remove(cashAccount)
  }

  private async findOrFail(id: string): Promise<CashAccount> {
    const cashAccount = await this.cashAccounts.findOne({ where: { id } })
    if (!cashAccount) throw new NotFoundException('Kasa hesabı bulunamadı')
    return cashAccount
  }
}

export function toCashAccountDto(ca: CashAccount): CashAccountDto {
  return {
    id: ca.id,
    name: ca.name,
    currency: ca.currency,
    openingBalance: ca.openingBalance,
    description: ca.description,
    isActive: ca.isActive,
    createdAt: ca.createdAt.toISOString(),
    updatedAt: ca.updatedAt.toISOString(),
  }
}
