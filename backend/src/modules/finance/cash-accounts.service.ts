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
import { FinanceTransactionsService } from './finance-transactions.service'

@Injectable()
export class CashAccountsService {
  constructor(
    @InjectRepository(CashAccount)
    private readonly cashAccounts: Repository<CashAccount>,
    private readonly txs: FinanceTransactionsService,
  ) {}

  async list(): Promise<CashAccountDto[]> {
    const rows = await this.cashAccounts.find({ order: { name: 'ASC' } })
    return Promise.all(rows.map((row) => this.toDto(row)))
  }

  async get(id: string): Promise<CashAccountDto> {
    return this.toDto(await this.findOrFail(id))
  }

  async create(dto: CreateCashAccountDto): Promise<CashAccountDto> {
    const exists = await this.cashAccounts.findOne({ where: { name: dto.name } })
    if (exists) throw new BadRequestException('Bu kasa ismi zaten kullanımda')

    const cashAccount = this.cashAccounts.create(dto)
    const saved = await this.cashAccounts.save(cashAccount)
    return this.toDto(saved)
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
    return this.toDto(saved)
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

  private async toDto(ca: CashAccount): Promise<CashAccountDto> {
    const sum = await this.txs.getSum(ca.id, 'cash')
    return {
      id: ca.id,
      name: ca.name,
      currency: ca.currency,
      openingBalance: ca.openingBalance,
      balance: ca.openingBalance + sum,
      description: ca.description,
      isActive: ca.isActive,
      createdAt: ca.createdAt.toISOString(),
      updatedAt: ca.updatedAt.toISOString(),
    }
  }
}
