import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import type {
  ContactTransactionDto,
  ContactTransactionListQuery,
} from '@turbohesap/shared'

import { Contact } from './entities/contact.entity'
import { ContactTransaction } from './entities/contact-transaction.entity'
import type {
  CreateContactTransactionDto,
  UpdateContactTransactionDto,
} from './dto/contact-transaction.dto'

@Injectable()
export class ContactTransactionsService {
  constructor(
    @InjectRepository(ContactTransaction)
    private readonly transactions: Repository<ContactTransaction>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
  ) {}

  /** Cari Ekstre — chronological ledger with a per-row running balance (signed,
   *  + = debit/borç side), seeded from the contact's opening balance. */
  async list(query: ContactTransactionListQuery): Promise<ContactTransactionDto[]> {
    const contact = await this.contacts.findOne({ where: { id: query.contactId } })
    if (!contact) throw new NotFoundException('Cari bulunamadı')

    const rows = await this.transactions.find({
      where: { contactId: query.contactId },
      order: { date: 'ASC', createdAt: 'ASC' },
    })

    let running = contact.openingBalanceSide === 'debit' ? contact.openingBalance : -contact.openingBalance
    return rows
      .filter((r) => withinRange(r.date, query.from, query.to))
      .map((r) => {
        running += r.debit - r.credit
        return toContactTransactionDto(r, running)
      })
  }

  async get(id: string): Promise<ContactTransactionDto> {
    return toContactTransactionDto(await this.findOrFail(id), 0)
  }

  async create(dto: CreateContactTransactionDto): Promise<ContactTransactionDto> {
    if (!(await this.contacts.findOne({ where: { id: dto.contactId } }))) {
      throw new NotFoundException('Cari bulunamadı')
    }
    const debit = dto.debit ?? 0
    const credit = dto.credit ?? 0
    if (debit <= 0 && credit <= 0) {
      throw new BadRequestException('Borç veya alacak tutarı girilmelidir')
    }
    if (debit > 0 && credit > 0) {
      throw new BadRequestException('Aynı satırda hem borç hem alacak girilemez')
    }
    const tx = this.transactions.create({
      contactId: dto.contactId,
      date: dto.date,
      documentType: dto.documentType,
      documentNo: dto.documentNo ?? null,
      description: dto.description ?? null,
      debit,
      credit,
      currencyCode: dto.currencyCode ?? 'TRY',
      exchangeRate: dto.exchangeRate ?? 1,
      dueDate: dto.dueDate ?? null,
      sourceModule: dto.sourceModule ?? null,
      sourceId: dto.sourceId ?? null,
    })
    const saved = await this.transactions.save(tx)
    return toContactTransactionDto(saved, saved.debit - saved.credit)
  }

  async update(id: string, dto: UpdateContactTransactionDto): Promise<ContactTransactionDto> {
    const tx = await this.findOrFail(id)
    const debit = dto.debit ?? tx.debit
    const credit = dto.credit ?? tx.credit
    if (debit <= 0 && credit <= 0) {
      throw new BadRequestException('Borç veya alacak tutarı girilmelidir')
    }
    if (debit > 0 && credit > 0) {
      throw new BadRequestException('Aynı satırda hem borç hem alacak girilemez')
    }
    if (dto.date !== undefined) tx.date = dto.date
    if (dto.documentType !== undefined) tx.documentType = dto.documentType
    if (dto.documentNo !== undefined) tx.documentNo = dto.documentNo
    if (dto.description !== undefined) tx.description = dto.description
    if (dto.debit !== undefined) tx.debit = dto.debit
    if (dto.credit !== undefined) tx.credit = dto.credit
    if (dto.currencyCode !== undefined) tx.currencyCode = dto.currencyCode
    if (dto.exchangeRate !== undefined) tx.exchangeRate = dto.exchangeRate
    if (dto.dueDate !== undefined) tx.dueDate = dto.dueDate
    const saved = await this.transactions.save(tx)
    return toContactTransactionDto(saved, saved.debit - saved.credit)
  }

  async remove(id: string): Promise<void> {
    const tx = await this.findOrFail(id)
    await this.transactions.remove(tx)
  }

  private async findOrFail(id: string): Promise<ContactTransaction> {
    const tx = await this.transactions.findOne({ where: { id } })
    if (!tx) throw new NotFoundException('Cari hareket bulunamadı')
    return tx
  }
}

function withinRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

export function toContactTransactionDto(
  t: ContactTransaction,
  runningBalance: number,
): ContactTransactionDto {
  return {
    id: t.id,
    contactId: t.contactId,
    date: t.date,
    documentType: t.documentType,
    documentNo: t.documentNo,
    description: t.description,
    debit: t.debit,
    credit: t.credit,
    currencyCode: t.currencyCode,
    exchangeRate: t.exchangeRate,
    dueDate: t.dueDate,
    runningBalance,
    sourceModule: t.sourceModule,
    sourceId: t.sourceId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}
