import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { BankAccountDto } from '@turbohesap/shared'
import { BankAccount } from './entities/bank-account.entity'
import type { CreateBankAccountDto, UpdateBankAccountDto } from './dto/bank-account.dto'
import { FinanceTransactionsService } from './finance-transactions.service'

@Injectable()
export class BankAccountsService {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccounts: Repository<BankAccount>,
    private readonly txs: FinanceTransactionsService,
  ) {}

  async list(): Promise<BankAccountDto[]> {
    const rows = await this.bankAccounts.find({ order: { name: 'ASC' } })
    return Promise.all(rows.map((row) => this.toDto(row)))
  }

  async get(id: string): Promise<BankAccountDto> {
    return this.toDto(await this.findOrFail(id))
  }

  async create(dto: CreateBankAccountDto): Promise<BankAccountDto> {
    const existsName = await this.bankAccounts.findOne({ where: { name: dto.name } })
    if (existsName) throw new BadRequestException('Bu hesap ismi zaten kullanımda')

    const existsIban = await this.bankAccounts.findOne({ where: { iban: dto.iban } })
    if (existsIban) throw new BadRequestException('Bu IBAN zaten kayıtlı')

    const bankAccount = this.bankAccounts.create(dto)
    const saved = await this.bankAccounts.save(bankAccount)
    return this.toDto(saved)
  }

  async update(id: string, dto: UpdateBankAccountDto): Promise<BankAccountDto> {
    const bankAccount = await this.findOrFail(id)
    if (dto.name && dto.name !== bankAccount.name) {
      const clash = await this.bankAccounts.findOne({ where: { name: dto.name } })
      if (clash && clash.id !== id) {
        throw new BadRequestException('Bu hesap ismi zaten kullanımda')
      }
    }
    if (dto.iban && dto.iban !== bankAccount.iban) {
      const clash = await this.bankAccounts.findOne({ where: { iban: dto.iban } })
      if (clash && clash.id !== id) {
        throw new BadRequestException('Bu IBAN zaten kayıtlı')
      }
    }
    Object.assign(bankAccount, dto)
    const saved = await this.bankAccounts.save(bankAccount)
    return this.toDto(saved)
  }

  async remove(id: string): Promise<void> {
    const bankAccount = await this.findOrFail(id)
    await this.bankAccounts.remove(bankAccount)
  }

  private async findOrFail(id: string): Promise<BankAccount> {
    const bankAccount = await this.bankAccounts.findOne({ where: { id } })
    if (!bankAccount) throw new NotFoundException('Banka hesabı bulunamadı')
    return bankAccount
  }

  private async toDto(ba: BankAccount): Promise<BankAccountDto> {
    const sum = await this.txs.getSum(ba.id, 'bank')
    return {
      id: ba.id,
      name: ba.name,
      bankName: ba.bankName,
      branchName: ba.branchName,
      branchCode: ba.branchCode,
      accountNumber: ba.accountNumber,
      iban: ba.iban,
      currency: ba.currency,
      openingBalance: ba.openingBalance,
      balance: ba.openingBalance + sum,
      description: ba.description,
      isActive: ba.isActive,
      createdAt: ba.createdAt.toISOString(),
      updatedAt: ba.updatedAt.toISOString(),
    }
  }
}
