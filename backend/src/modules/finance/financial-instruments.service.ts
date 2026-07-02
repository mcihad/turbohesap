import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { FinancialInstrumentDto, InstrumentListQuery } from '@turbohesap/shared'

import { ContactTransaction } from '../contacts/entities/contact-transaction.entity'
import { Contact } from '../contacts/entities/contact.entity'
import { DocumentCategory } from '../documents/entities/document-category.entity'
import { DocumentsService } from '../documents/documents.service'
import { BankAccount } from './entities/bank-account.entity'
import { CashAccount } from './entities/cash-account.entity'
import { FinancialInstrument } from './entities/financial-instrument.entity'
import { FinanceTransaction } from './entities/finance-transaction.entity'
import type { CreateFinancialInstrumentDto } from './dto/create-financial-instrument.dto'
import type { SettleInstrumentDto } from './dto/settle-instrument.dto'
import type { UpdateFinancialInstrumentDto } from './dto/update-financial-instrument.dto'

const CHECK_NOTE_CATEGORY_CODE = 'CEK_SENET'

// Çek/Senet portföyü. Her enstrüman oluşturulduğunda `documents` modülünde
// otomatik bir Evrak kaydı açılır (bkz. `create()`), yalnız enstrüman
// silinirken evrak silinmez — sadece ilişkisi temizlenir (bkz. `remove()`).
// `collect`/`pay`/`reverse` atomik finance+cari kaydı atar (invoices'ın
// `addPayment`/`cancel` deseni, satır satır); diğer geçişler yalnız durum
// değiştirir.
@Injectable()
export class FinancialInstrumentsService {
  constructor(
    @InjectRepository(FinancialInstrument)
    private readonly instruments: Repository<FinancialInstrument>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(CashAccount) private readonly cashAccounts: Repository<CashAccount>,
    @InjectRepository(BankAccount) private readonly bankAccounts: Repository<BankAccount>,
    @InjectRepository(DocumentCategory)
    private readonly documentCategories: Repository<DocumentCategory>,
    private readonly documents: DocumentsService,
  ) {}

  async list(query?: InstrumentListQuery): Promise<FinancialInstrumentDto[]> {
    const qb = this.instruments.createQueryBuilder('i')
    if (query?.direction) qb.andWhere('i.direction = :direction', { direction: query.direction })
    if (query?.instrumentType) {
      qb.andWhere('i.instrumentType = :instrumentType', { instrumentType: query.instrumentType })
    }
    if (query?.status) qb.andWhere('i.status = :status', { status: query.status })
    if (query?.contactId) qb.andWhere('i.contactId = :contactId', { contactId: query.contactId })
    if (query?.from) qb.andWhere('i.dueDate >= :from', { from: query.from })
    if (query?.to) qb.andWhere('i.dueDate <= :to', { to: query.to })
    if (query?.search) {
      qb.andWhere('(i.instrumentNo ILIKE :q OR i.drawerName ILIKE :q)', { q: `%${query.search}%` })
    }
    qb.orderBy('i.dueDate', 'ASC')
    const rows = await qb.getMany()
    if (rows.length === 0) return []
    const nameMap = await this.contactNameMap(rows.map((r) => r.contactId))
    return rows.map((r) => toDto(r, nameMap.get(r.contactId) ?? null))
  }

  async get(id: string): Promise<FinancialInstrumentDto> {
    const row = await this.findOrFail(id)
    const nameMap = await this.contactNameMap([row.contactId])
    return toDto(row, nameMap.get(row.contactId) ?? null)
  }

  async create(dto: CreateFinancialInstrumentDto, userId: string): Promise<FinancialInstrumentDto> {
    const contact = await this.contacts.findOne({ where: { id: dto.contactId } })
    if (!contact) throw new BadRequestException('Geçersiz cari')

    const categoryId = await this.ensureCheckNoteCategory()
    const isCheck = dto.instrumentType === 'check'
    const typeLabel = isCheck ? 'Çek' : 'Senet'
    const doc = await this.documents.create(
      {
        categoryId,
        title: `${typeLabel}${dto.instrumentNo ? ` ${dto.instrumentNo}` : ''} — ${contact.name}`,
        tags: [dto.instrumentType, dto.direction],
        isTimeBound: true,
        issueDate: dto.issueDate,
        expiryDate: dto.dueDate,
        relatedEntityType: 'FinancialInstrument',
      },
      userId,
    )

    const row = this.instruments.create({
      instrumentType: dto.instrumentType,
      direction: dto.direction,
      status: 'open',
      branchId: dto.branchId ?? null,
      contactId: dto.contactId,
      amount: dto.amount,
      currencyCode: dto.currencyCode ?? 'TRY',
      issueDate: dto.issueDate,
      dueDate: dto.dueDate,
      instrumentNo: dto.instrumentNo ?? '',
      bankName: isCheck ? dto.bankName ?? null : null,
      bankBranch: isCheck ? dto.bankBranch ?? null : null,
      accountNo: isCheck ? dto.accountNo ?? null : null,
      drawerName: dto.drawerName ?? null,
      notes: dto.notes ?? null,
      cashAccountId: null,
      bankAccountId: null,
      financeTransactionId: null,
      contactTransactionId: null,
      documentId: doc.id,
      createdById: userId,
    })
    const saved = await this.instruments.save(row)

    await this.documents.update(doc.id, { relatedEntityId: saved.id }, userId)

    return this.get(saved.id)
  }

  async update(
    id: string,
    dto: UpdateFinancialInstrumentDto,
    userId: string,
  ): Promise<FinancialInstrumentDto> {
    const row = await this.findOrFail(id)
    if (row.status !== 'open') {
      throw new BadRequestException('Yalnızca açık durumdaki çek/senet düzenlenebilir')
    }

    if (dto.contactId !== undefined) {
      const contact = await this.contacts.findOne({ where: { id: dto.contactId } })
      if (!contact) throw new BadRequestException('Geçersiz cari')
      row.contactId = dto.contactId
    }
    if (dto.branchId !== undefined) row.branchId = dto.branchId ?? null
    if (dto.amount !== undefined) row.amount = dto.amount
    if (dto.currencyCode !== undefined) row.currencyCode = dto.currencyCode
    if (dto.issueDate !== undefined) row.issueDate = dto.issueDate
    if (dto.dueDate !== undefined) row.dueDate = dto.dueDate
    if (dto.instrumentNo !== undefined) row.instrumentNo = dto.instrumentNo
    if (row.instrumentType === 'check') {
      if (dto.bankName !== undefined) row.bankName = dto.bankName ?? null
      if (dto.bankBranch !== undefined) row.bankBranch = dto.bankBranch ?? null
      if (dto.accountNo !== undefined) row.accountNo = dto.accountNo ?? null
    }
    if (dto.drawerName !== undefined) row.drawerName = dto.drawerName ?? null
    if (dto.notes !== undefined) row.notes = dto.notes ?? null

    await this.instruments.save(row)

    if (row.documentId && (dto.dueDate !== undefined || dto.issueDate !== undefined)) {
      await this.documents.update(
        row.documentId,
        {
          ...(dto.dueDate !== undefined ? { expiryDate: dto.dueDate } : {}),
          ...(dto.issueDate !== undefined ? { issueDate: dto.issueDate } : {}),
        },
        userId,
      )
    }

    return this.get(id)
  }

  async remove(id: string, userId: string): Promise<void> {
    const row = await this.findOrFail(id)
    if (row.status !== 'open') {
      throw new BadRequestException('Yalnızca açık durumdaki çek/senet silinebilir')
    }
    // Evrak kalır, sadece ilişkisi temizlenir (bkz. plan §2.1).
    if (row.documentId) {
      await this.documents.update(
        row.documentId,
        { relatedEntityType: null, relatedEntityId: null },
        userId,
      )
    }
    await this.instruments.remove(row)
  }

  // --- Status-only geçişler --------------------------------------------------

  async depositForCollection(id: string): Promise<FinancialInstrumentDto> {
    const row = await this.findOrFail(id)
    this.requireDirection(row, 'received')
    if (row.status !== 'open') {
      throw new BadRequestException('Yalnızca açık durumdaki çek/senet tahsile verilebilir')
    }
    row.status = 'in_collection'
    await this.instruments.save(row)
    return this.get(id)
  }

  async bounce(id: string): Promise<FinancialInstrumentDto> {
    const row = await this.findOrFail(id)
    if (row.status !== 'open' && row.status !== 'in_collection') {
      throw new BadRequestException(
        'Bu durumdaki çek/senet karşılıksız işaretlenemez (tahsil/ödeme yapılmışsa önce geri alın)',
      )
    }
    row.status = 'bounced'
    await this.instruments.save(row)
    return this.get(id)
  }

  async endorse(id: string): Promise<FinancialInstrumentDto> {
    const row = await this.findOrFail(id)
    this.requireDirection(row, 'received')
    if (row.status !== 'open') {
      throw new BadRequestException('Yalnızca açık durumdaki çek/senet ciro edilebilir')
    }
    row.status = 'endorsed'
    await this.instruments.save(row)
    return this.get(id)
  }

  async pledge(id: string): Promise<FinancialInstrumentDto> {
    const row = await this.findOrFail(id)
    this.requireDirection(row, 'received')
    if (row.status !== 'open') {
      throw new BadRequestException('Yalnızca açık durumdaki çek/senet teminata verilebilir')
    }
    row.status = 'pledged'
    await this.instruments.save(row)
    return this.get(id)
  }

  async cancel(id: string): Promise<FinancialInstrumentDto> {
    const row = await this.findOrFail(id)
    if (row.status !== 'open') {
      throw new BadRequestException('Yalnızca açık durumdaki çek/senet iptal edilebilir')
    }
    row.status = 'cancelled'
    await this.instruments.save(row)
    return this.get(id)
  }

  // --- Atomik (finance + cari) geçişler ---------------------------------------

  async collect(id: string, input: SettleInstrumentDto): Promise<FinancialInstrumentDto> {
    const row = await this.findOrFail(id)
    this.requireDirection(row, 'received')
    if (row.status !== 'open' && row.status !== 'in_collection') {
      throw new BadRequestException('Yalnızca açık veya tahsildeki çek/senet tahsil edilebilir')
    }
    await this.assertAccount(input)
    await this.postSettlement(row, input, 'collected', 'in')
    return this.get(id)
  }

  async pay(id: string, input: SettleInstrumentDto): Promise<FinancialInstrumentDto> {
    const row = await this.findOrFail(id)
    this.requireDirection(row, 'issued')
    if (row.status !== 'open') {
      throw new BadRequestException('Yalnızca açık durumdaki çek/senet ödenebilir')
    }
    await this.assertAccount(input)
    await this.postSettlement(row, input, 'paid', 'out')
    return this.get(id)
  }

  async reverse(id: string): Promise<FinancialInstrumentDto> {
    const row = await this.findOrFail(id)
    if (row.status !== 'collected' && row.status !== 'paid') {
      throw new BadRequestException('Yalnızca tahsil edilmiş/ödenmiş çek/senet geri alınabilir')
    }
    await this.instruments.manager.transaction(async (em) => {
      if (row.financeTransactionId) {
        await em.getRepository(FinanceTransaction).delete({ id: row.financeTransactionId })
      }
      if (row.contactTransactionId) {
        await em.getRepository(ContactTransaction).delete({ id: row.contactTransactionId })
      }
      row.status = 'open'
      row.cashAccountId = null
      row.bankAccountId = null
      row.financeTransactionId = null
      row.contactTransactionId = null
      await em.getRepository(FinancialInstrument).save(row)
    })
    return this.get(id)
  }

  // --- Helpers -----------------------------------------------------------

  private async postSettlement(
    row: FinancialInstrument,
    input: SettleInstrumentDto,
    nextStatus: 'collected' | 'paid',
    financeType: 'in' | 'out',
  ): Promise<void> {
    const label = `${row.instrumentType === 'check' ? 'Çek' : 'Senet'}${row.instrumentNo ? ` ${row.instrumentNo}` : ''}`
    const description = input.description?.trim() || `${label} ${nextStatus === 'collected' ? 'tahsilat' : 'ödeme'}`
    await this.instruments.manager.transaction(async (em) => {
      const fin = await em.getRepository(FinanceTransaction).save(
        em.getRepository(FinanceTransaction).create({
          cashAccountId: input.cashAccountId ?? null,
          bankAccountId: input.bankAccountId ?? null,
          contactId: row.contactId,
          type: financeType,
          amount: row.amount,
          date: new Date(input.date),
          description,
        }),
      )
      const tx = await em.getRepository(ContactTransaction).save(
        em.getRepository(ContactTransaction).create({
          contactId: row.contactId,
          date: input.date,
          documentType: row.instrumentType,
          documentNo: row.instrumentNo || null,
          description,
          debit: financeType === 'out' ? row.amount : 0,
          credit: financeType === 'in' ? row.amount : 0,
          currencyCode: row.currencyCode,
          // decimalTransformer.to(undefined) → null, which would violate the
          // column's NOT NULL constraint and skip its DB default — always set
          // transformer columns explicitly (agy.md §7.1 gotcha).
          exchangeRate: 1,
          sourceModule: 'finance-instrument',
          sourceId: row.id,
        }),
      )
      row.status = nextStatus
      row.cashAccountId = input.cashAccountId ?? null
      row.bankAccountId = input.bankAccountId ?? null
      row.financeTransactionId = fin.id
      row.contactTransactionId = tx.id
      await em.getRepository(FinancialInstrument).save(row)
    })
  }

  private requireDirection(row: FinancialInstrument, direction: 'received' | 'issued'): void {
    if (row.direction !== direction) {
      throw new BadRequestException(
        direction === 'received'
          ? 'Bu işlem yalnızca alınan çek/senetler için geçerli'
          : 'Bu işlem yalnızca verilen çek/senetler için geçerli',
      )
    }
  }

  private async assertAccount(input: SettleInstrumentDto): Promise<void> {
    const hasCash = !!input.cashAccountId
    const hasBank = !!input.bankAccountId
    if (hasCash === hasBank) {
      throw new BadRequestException('Kasa veya banka hesabından tam biri seçilmelidir')
    }
    if (hasCash) {
      const exists = await this.cashAccounts.findOne({
        where: { id: input.cashAccountId! },
        select: { id: true },
      })
      if (!exists) throw new BadRequestException('Geçersiz kasa hesabı')
    } else {
      const exists = await this.bankAccounts.findOne({
        where: { id: input.bankAccountId! },
        select: { id: true },
      })
      if (!exists) throw new BadRequestException('Geçersiz banka hesabı')
    }
  }

  private async ensureCheckNoteCategory(): Promise<string> {
    const existing = await this.documentCategories.findOne({
      where: { code: CHECK_NOTE_CATEGORY_CODE },
    })
    if (existing) return existing.id
    const created = await this.documentCategories.save(
      this.documentCategories.create({ name: 'Çek/Senet', code: CHECK_NOTE_CATEGORY_CODE }),
    )
    return created.id
  }

  private async contactNameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)]
    if (unique.length === 0) return new Map()
    const rows = await this.contacts.find({
      where: { id: In(unique) },
      select: { id: true, name: true },
    })
    return new Map(rows.map((c) => [c.id, c.name]))
  }

  private async findOrFail(id: string): Promise<FinancialInstrument> {
    const row = await this.instruments.findOne({ where: { id } })
    if (!row) throw new NotFoundException('Çek/Senet bulunamadı')
    return row
  }
}

function toDto(row: FinancialInstrument, contactName: string | null): FinancialInstrumentDto {
  return {
    id: row.id,
    instrumentType: row.instrumentType,
    direction: row.direction,
    status: row.status,
    branchId: row.branchId,
    contactId: row.contactId,
    contactName,
    amount: row.amount,
    currencyCode: row.currencyCode,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    instrumentNo: row.instrumentNo,
    bankName: row.bankName,
    bankBranch: row.bankBranch,
    accountNo: row.accountNo,
    drawerName: row.drawerName,
    notes: row.notes,
    cashAccountId: row.cashAccountId,
    bankAccountId: row.bankAccountId,
    financeTransactionId: row.financeTransactionId,
    contactTransactionId: row.contactTransactionId,
    documentId: row.documentId,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
