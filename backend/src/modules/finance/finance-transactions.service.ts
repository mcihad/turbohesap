import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { FinanceTransactionDto } from '@turbohesap/shared'
import { FinanceTransaction } from './entities/finance-transaction.entity'
import type { CreateFinanceTransactionDto, UpdateFinanceTransactionDto } from './dto/finance-transaction.dto'

@Injectable()
export class FinanceTransactionsService {
  constructor(
    @InjectRepository(FinanceTransaction)
    private readonly transactions: Repository<FinanceTransaction>,
  ) {}

  async list(query?: { cashAccountId?: string; bankAccountId?: string }): Promise<FinanceTransactionDto[]> {
    const qb = this.transactions.createQueryBuilder('t').orderBy('t.date', 'DESC').addOrderBy('t.createdAt', 'DESC')
    
    if (query?.cashAccountId) {
      qb.andWhere('t.cashAccountId = :cashAccountId', { cashAccountId: query.cashAccountId })
    }
    if (query?.bankAccountId) {
      qb.andWhere('t.bankAccountId = :bankAccountId', { bankAccountId: query.bankAccountId })
    }

    const rows = await qb.getMany()
    return rows.map(toFinanceTransactionDto)
  }

  async get(id: string): Promise<FinanceTransactionDto> {
    return toFinanceTransactionDto(await this.findOrFail(id))
  }

  async create(dto: CreateFinanceTransactionDto): Promise<FinanceTransactionDto> {
    if (!dto.cashAccountId && !dto.bankAccountId) {
      throw new BadRequestException('Kasa hesabı veya banka hesabı seçilmelidir')
    }
    if (dto.cashAccountId && dto.bankAccountId) {
      throw new BadRequestException('Aynı anda hem kasa hem banka hesabı seçilemez')
    }

    const tx = this.transactions.create({
      ...dto,
      date: new Date(dto.date),
    })
    const saved = await this.transactions.save(tx)
    return toFinanceTransactionDto(saved)
  }

  async update(id: string, dto: UpdateFinanceTransactionDto): Promise<FinanceTransactionDto> {
    const tx = await this.findOrFail(id)
    
    const cashAccountId = dto.cashAccountId !== undefined ? dto.cashAccountId : tx.cashAccountId
    const bankAccountId = dto.bankAccountId !== undefined ? dto.bankAccountId : tx.bankAccountId
    
    if (!cashAccountId && !bankAccountId) {
      throw new BadRequestException('Kasa hesabı veya banka hesabı seçilmelidir')
    }
    if (cashAccountId && bankAccountId) {
      throw new BadRequestException('Aynı anda hem kasa hem banka hesabı seçilemez')
    }

    if (dto.cashAccountId !== undefined) tx.cashAccountId = dto.cashAccountId
    if (dto.bankAccountId !== undefined) tx.bankAccountId = dto.bankAccountId
    if (dto.contactId !== undefined) tx.contactId = dto.contactId
    if (dto.type !== undefined) tx.type = dto.type
    if (dto.amount !== undefined) tx.amount = dto.amount
    if (dto.date !== undefined) tx.date = new Date(dto.date)
    if (dto.description !== undefined) tx.description = dto.description

    const saved = await this.transactions.save(tx)
    return toFinanceTransactionDto(saved)
  }

  async remove(id: string): Promise<void> {
    const tx = await this.findOrFail(id)
    await this.transactions.remove(tx)
  }

  async getSum(accountId: string, accountType: 'cash' | 'bank'): Promise<number> {
    const query = this.transactions.createQueryBuilder('t')
      .select("SUM(CASE WHEN t.type = 'in' THEN t.amount ELSE -t.amount END)", 'sum')
    
    if (accountType === 'cash') {
      query.where('t.cashAccountId = :accountId', { accountId })
    } else {
      query.where('t.bankAccountId = :accountId', { accountId })
    }
    
    const res = await query.getRawOne()
    return res && res.sum ? Number(res.sum) : 0
  }

  private async findOrFail(id: string): Promise<FinanceTransaction> {
    const tx = await this.transactions.findOne({ where: { id } })
    if (!tx) throw new NotFoundException('Finansal işlem bulunamadı')
    return tx
  }
}

export function toFinanceTransactionDto(t: FinanceTransaction): FinanceTransactionDto {
  return {
    id: t.id,
    cashAccountId: t.cashAccountId,
    bankAccountId: t.bankAccountId,
    contactId: t.contactId,
    type: t.type,
    amount: t.amount,
    date: t.date.toISOString(),
    description: t.description,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}
