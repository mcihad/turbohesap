import { randomUUID } from 'node:crypto'

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import {
  computeInvoiceTotals,
  computeLine,
  type CreateInvoicePaymentRequest,
  type InvoiceDto,
  type InvoiceLineDto,
  type InvoiceListQuery,
  type InvoicePaymentDto,
  type InvoiceType,
} from '@turbohesap/shared'

import { Invoice } from './entities/invoice.entity'
import { InvoiceLine } from './entities/invoice-line.entity'
import { InvoicePayment } from './entities/invoice-payment.entity'
import { Contact } from '../contacts/entities/contact.entity'
import { ContactTransaction } from '../contacts/entities/contact-transaction.entity'
import { ContactAddress } from '../contacts/entities/contact-address.entity'
import { Product } from '../inventory/entities/product.entity'
import { FinanceTransaction } from '../finance/entities/finance-transaction.entity'
import { CashAccount } from '../finance/entities/cash-account.entity'
import { BankAccount } from '../finance/entities/bank-account.entity'
import { User } from '../iam/entities/user.entity'
import { StockMovementsService } from '../inventory/stock-movements.service'
import { StockMovementTypesService } from '../inventory/stock-movement-types.service'
import { buildInvoiceUbl, sellerFromEnv } from './invoice-ubl'
import type { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto'

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(InvoiceLine) private readonly lines: Repository<InvoiceLine>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(ContactTransaction)
    private readonly ledger: Repository<ContactTransaction>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ContactAddress) private readonly addresses: Repository<ContactAddress>,
    @InjectRepository(InvoicePayment) private readonly payments: Repository<InvoicePayment>,
    @InjectRepository(FinanceTransaction) private readonly finance: Repository<FinanceTransaction>,
    @InjectRepository(CashAccount) private readonly cashAccounts: Repository<CashAccount>,
    @InjectRepository(BankAccount) private readonly bankAccounts: Repository<BankAccount>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly stockMovements: StockMovementsService,
    private readonly movementTypes: StockMovementTypesService,
  ) {}

  /** A branch-restricted user may only invoice within their authorized branches. */
  private async assertBranchAllowed(userId: string | undefined, branchId: string | null): Promise<void> {
    if (!userId) return
    const user = await this.users.findOne({ where: { id: userId } })
    const allowed = (user?.branches ?? []).map((b) => b.id)
    if (allowed.length === 0) return // unrestricted (admin / no branch assignment)
    if (!branchId) throw new ForbiddenException('Şube seçili olmayan fatura kesemezsiniz')
    if (!allowed.includes(branchId)) throw new ForbiddenException('Bu şube için fatura kesme yetkiniz yok')
  }

  // ── Payments (tahsilat/ödeme) ─────────────────────────────────────────────
  async listPayments(invoiceId: string): Promise<InvoicePaymentDto[]> {
    const rows = await this.payments.find({ where: { invoiceId }, order: { date: 'ASC', createdAt: 'ASC' } })
    if (rows.length === 0) return []
    const [cash, bank] = await Promise.all([this.cashAccounts.find(), this.bankAccounts.find()])
    const names = new Map<string, string>()
    for (const a of cash) names.set(a.id, a.name)
    for (const a of bank) names.set(a.id, a.name)
    return rows.map((p) => toPaymentDto(p, names.get((p.cashAccountId ?? p.bankAccountId) as string) ?? null))
  }

  async addPayment(invoiceId: string, input: CreateInvoicePaymentRequest): Promise<InvoiceDto> {
    const invoice = await this.findOrFail(invoiceId)
    if (invoice.status !== 'issued' && invoice.status !== 'paid') {
      throw new BadRequestException('Yalnızca kesilmiş faturaya tahsilat/ödeme eklenebilir')
    }
    if (!input.amount || input.amount <= 0) throw new BadRequestException('Tutar girilmelidir')
    if (input.method === 'cash' && !input.cashAccountId) throw new BadRequestException('Kasa seçilmelidir')
    if (input.method === 'bank' && !input.bankAccountId) throw new BadRequestException('Banka hesabı seçilmelidir')

    await this.invoices.manager.transaction(async (em) => {
      // kasa/banka hareketi: satışta giriş (tahsilat), alışta çıkış (ödeme).
      const moneyIn = invoice.type === 'sales'
      const fin = await em.getRepository(FinanceTransaction).save(
        em.getRepository(FinanceTransaction).create({
          cashAccountId: input.method === 'cash' ? input.cashAccountId ?? null : null,
          bankAccountId: input.method === 'bank' ? input.bankAccountId ?? null : null,
          contactId: invoice.contactId,
          type: moneyIn ? 'in' : 'out',
          amount: input.amount,
          date: new Date(input.date),
          description: input.description?.trim() || `Fatura ${invoice.series}${invoice.number} ${moneyIn ? 'tahsilat' : 'ödeme'}`,
        }),
      )
      // cari hareketi: satış tahsilatı cariyi alacaklandırır (borç kapanır); alış ödemesi borçlandırır.
      const tx = await em.getRepository(ContactTransaction).save(
        em.getRepository(ContactTransaction).create({
          contactId: invoice.contactId,
          date: input.date,
          documentType: moneyIn ? 'receipt' : 'payment',
          documentNo: `${invoice.series}${invoice.number}`,
          description: `Fatura ${invoice.series}${invoice.number} ${moneyIn ? 'tahsilat' : 'ödeme'}`,
          debit: moneyIn ? 0 : input.amount,
          credit: moneyIn ? input.amount : 0,
          currencyCode: invoice.currencyCode,
          exchangeRate: invoice.exchangeRate,
          sourceModule: 'invoice-payment',
        }),
      )
      const payment = await em.getRepository(InvoicePayment).save(
        em.getRepository(InvoicePayment).create({
          invoiceId,
          contactId: invoice.contactId,
          date: input.date,
          amount: input.amount,
          method: input.method,
          cashAccountId: input.cashAccountId ?? null,
          bankAccountId: input.bankAccountId ?? null,
          description: input.description ?? null,
          financeTransactionId: fin.id,
          contactTransactionId: tx.id,
        }),
      )
      // tag the cari row with the payment id for traceability
      tx.sourceId = payment.id
      await em.getRepository(ContactTransaction).save(tx)
      await this.refreshPaidStatus(em, invoiceId)
    })
    return this.get(invoiceId)
  }

  async removePayment(paymentId: string): Promise<void> {
    const payment = await this.payments.findOne({ where: { id: paymentId } })
    if (!payment) throw new NotFoundException('Ödeme kaydı bulunamadı')
    await this.invoices.manager.transaction(async (em) => {
      if (payment.financeTransactionId) {
        await em.getRepository(FinanceTransaction).delete({ id: payment.financeTransactionId })
      }
      if (payment.contactTransactionId) {
        await em.getRepository(ContactTransaction).delete({ id: payment.contactTransactionId })
      }
      await em.getRepository(InvoicePayment).delete({ id: paymentId })
      await this.refreshPaidStatus(em, payment.invoiceId)
    })
  }

  private async refreshPaidStatus(em: import('typeorm').EntityManager, invoiceId: string): Promise<void> {
    const invRepo = em.getRepository(Invoice)
    const inv = await invRepo.findOne({ where: { id: invoiceId } })
    if (!inv || inv.status === 'cancelled' || inv.status === 'draft') return
    const paid = await this.paidTotalFor(em, invoiceId)
    inv.status = paid + 0.005 >= inv.grandTotal && inv.grandTotal > 0 ? 'paid' : 'issued'
    await invRepo.save(inv)
  }

  private async paidTotalFor(em: import('typeorm').EntityManager, invoiceId: string): Promise<number> {
    const res = await em
      .getRepository(InvoicePayment)
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .where('p.invoiceId = :invoiceId', { invoiceId })
      .getRawOne<{ sum: string }>()
    return res ? Number(res.sum) : 0
  }

  /** UBL-TR (GİB) e-Fatura/e-Arşiv XML for an invoice. */
  async getXml(id: string): Promise<string> {
    const invoice = await this.get(id)
    const contact = await this.contacts.findOne({ where: { id: invoice.contactId } })
    const addr =
      (await this.addresses.findOne({ where: { contactId: invoice.contactId, isPrimaryBilling: true } })) ??
      (await this.addresses.findOne({ where: { contactId: invoice.contactId } }))
    return buildInvoiceUbl(
      invoice,
      {
        name: contact?.name ?? '',
        isCompany: contact?.contactType === 'company',
        taxNumber: contact?.taxNumber ?? null,
        nationalId: contact?.nationalId ?? null,
        taxOffice: contact?.taxOffice ?? null,
        address: addr ? [addr.line1, addr.line2, addr.district].filter(Boolean).join(' ') : null,
        city: addr?.city ?? null,
      },
      sellerFromEnv(),
    )
  }

  async list(query?: InvoiceListQuery): Promise<InvoiceDto[]> {
    const qb = this.invoices.createQueryBuilder('i')
    if (query?.type) qb.andWhere('i.type = :type', { type: query.type })
    if (query?.status) qb.andWhere('i.status = :status', { status: query.status })
    if (query?.contactId) qb.andWhere('i.contactId = :contactId', { contactId: query.contactId })
    if (query?.from) qb.andWhere('i.date >= :from', { from: query.from })
    if (query?.to) qb.andWhere('i.date <= :to', { to: query.to })
    if (query?.search) {
      qb.andWhere('(i.number ILIKE :q OR i.series ILIKE :q)', { q: `%${query.search}%` })
    }
    qb.orderBy('i.date', 'DESC').addOrderBy('i.createdAt', 'DESC')
    const rows = await qb.getMany()
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.id)
    const allLines = await this.lines.find({ where: { invoiceId: In(ids) }, order: { sortOrder: 'ASC' } })
    const names = await this.contactNameMap(rows.map((r) => r.contactId))
    const paidMap = await this.paidMap(ids)
    const linesByInvoice = new Map<string, InvoiceLine[]>()
    for (const l of allLines) {
      const arr = linesByInvoice.get(l.invoiceId) ?? []
      arr.push(l)
      linesByInvoice.set(l.invoiceId, arr)
    }
    return rows.map((r) =>
      toInvoiceDto(r, linesByInvoice.get(r.id) ?? [], names.get(r.contactId) ?? null, paidMap.get(r.id) ?? 0),
    )
  }

  private async paidMap(ids: string[]): Promise<Map<string, number>> {
    const m = new Map<string, number>()
    if (ids.length === 0) return m
    const rows = await this.payments
      .createQueryBuilder('p')
      .select('p.invoiceId', 'iid')
      .addSelect('SUM(p.amount)', 'sum')
      .where('p.invoiceId IN (:...ids)', { ids })
      .groupBy('p.invoiceId')
      .getRawMany<{ iid: string; sum: string }>()
    for (const r of rows) m.set(r.iid, Number(r.sum))
    return m
  }

  async get(id: string): Promise<InvoiceDto> {
    const inv = await this.findOrFail(id)
    const [lines, contact, paid] = await Promise.all([
      this.lines.find({ where: { invoiceId: id }, order: { sortOrder: 'ASC' } }),
      this.contacts.findOne({ where: { id: inv.contactId } }),
      this.paidTotalFor(this.invoices.manager, id),
    ])
    return toInvoiceDto(inv, lines, contact?.name ?? null, paid)
  }

  async create(dto: CreateInvoiceDto, userId?: string): Promise<InvoiceDto> {
    if (!(await this.contacts.findOne({ where: { id: dto.contactId } }))) {
      throw new NotFoundException('Cari bulunamadı')
    }
    if (dto.status === 'issued') await this.assertBranchAllowed(userId, dto.branchId ?? null)
    const totals = computeInvoiceTotals(dto.lines)
    const invoice = this.invoices.create({
      type: dto.type,
      series: dto.series?.trim() || defaultSeries(dto.type, dto.date),
      number: '',
      ettn: null,
      date: dto.date,
      dueDate: dto.dueDate ?? null,
      contactId: dto.contactId,
      branchId: dto.branchId ?? null,
      currencyCode: dto.currencyCode ?? 'TRY',
      exchangeRate: dto.exchangeRate ?? 1,
      status: 'draft',
      eDocType: dto.eDocType ?? 'none',
      faturaTipi: dto.faturaTipi ?? (totals.withholdingTotal > 0 ? 'TEVKIFAT' : 'SATIS'),
      senaryo: dto.senaryo ?? 'TEMELFATURA',
      notes: dto.notes ?? null,
      postsStock: dto.postStock ?? true,
      ...totals,
    })
    const saved = await this.invoices.save(invoice)
    await this.lines.save(this.buildLines(saved.id, dto.lines))

    if (dto.status === 'issued') return this.issue(saved.id, userId)
    return this.get(saved.id)
  }

  async update(id: string, dto: UpdateInvoiceDto): Promise<InvoiceDto> {
    const invoice = await this.findOrFail(id)
    if (invoice.status !== 'draft') {
      throw new BadRequestException('Yalnızca taslak faturalar düzenlenebilir')
    }
    if (dto.contactId && dto.contactId !== invoice.contactId) {
      if (!(await this.contacts.findOne({ where: { id: dto.contactId } }))) {
        throw new NotFoundException('Cari bulunamadı')
      }
      invoice.contactId = dto.contactId
    }
    if (dto.type !== undefined) invoice.type = dto.type
    if (dto.date !== undefined) invoice.date = dto.date
    if (dto.dueDate !== undefined) invoice.dueDate = dto.dueDate
    if (dto.branchId !== undefined) invoice.branchId = dto.branchId
    if (dto.currencyCode !== undefined) invoice.currencyCode = dto.currencyCode
    if (dto.exchangeRate !== undefined) invoice.exchangeRate = dto.exchangeRate
    if (dto.series !== undefined) invoice.series = dto.series
    if (dto.faturaTipi !== undefined) invoice.faturaTipi = dto.faturaTipi
    if (dto.senaryo !== undefined) invoice.senaryo = dto.senaryo
    if (dto.eDocType !== undefined) invoice.eDocType = dto.eDocType
    if (dto.notes !== undefined) invoice.notes = dto.notes

    if (dto.lines) {
      const totals = computeInvoiceTotals(dto.lines)
      Object.assign(invoice, totals)
      await this.lines.delete({ invoiceId: id })
      await this.lines.save(this.buildLines(id, dto.lines))
    }
    await this.invoices.save(invoice)
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    const invoice = await this.findOrFail(id)
    if (invoice.status === 'issued') {
      throw new BadRequestException('Kesilmiş fatura silinemez; önce iptal edin')
    }
    await this.lines.delete({ invoiceId: id })
    await this.invoices.remove(invoice)
  }

  /** Finalize a draft: assign a gapless series number + post the cari ledger. */
  async issue(id: string, userId?: string): Promise<InvoiceDto> {
    const head = await this.findOrFail(id)
    await this.assertBranchAllowed(userId, head.branchId)
    return this.invoices.manager.transaction(async (em) => {
      const invRepo = em.getRepository(Invoice)
      const invoice = await invRepo.findOne({ where: { id } })
      if (!invoice) throw new NotFoundException('Fatura bulunamadı')
      if (invoice.status !== 'draft') {
        throw new BadRequestException('Yalnızca taslak faturalar kesilebilir')
      }
      // Gapless next number for the series (numbers are zero-padded → lexical max = numeric max).
      const last = await invRepo
        .createQueryBuilder('i')
        .select('i.number', 'number')
        .where('i.series = :series AND i.number <> :empty', { series: invoice.series, empty: '' })
        .orderBy('i.number', 'DESC')
        .limit(1)
        .getRawOne<{ number: string }>()
      const next = (last ? Number(last.number) : 0) + 1
      invoice.number = String(next).padStart(9, '0')
      invoice.ettn = randomUUID()
      invoice.status = 'issued'
      // Resolve the e-document kind: a company buyer with a VKN → e-Fatura,
      // otherwise e-Arşiv (a real impl would query the GİB mükellef list).
      if (invoice.eDocType === 'none') {
        const contact = await em.getRepository(Contact).findOne({ where: { id: invoice.contactId } })
        invoice.eDocType =
          contact?.contactType === 'company' && contact.taxNumber ? 'efatura' : 'earsiv'
      }
      await invRepo.save(invoice)

      // Post to the cari ledger (borç for a sale, alacak for a purchase).
      const debit = ledgerDebit(invoice.type)
      await em.getRepository(ContactTransaction).save(
        em.getRepository(ContactTransaction).create({
          contactId: invoice.contactId,
          date: invoice.date,
          documentType: 'invoice',
          documentNo: `${invoice.series}${invoice.number}`,
          description: `Fatura ${invoice.series}${invoice.number}`,
          debit: debit ? invoice.grandTotal : 0,
          credit: debit ? 0 : invoice.grandTotal,
          currencyCode: invoice.currencyCode,
          exchangeRate: invoice.exchangeRate,
          dueDate: invoice.dueDate,
          sourceModule: 'invoices',
          sourceId: invoice.id,
        }),
      )

      // Post stock movements for stock-tracked products — unless the stock was
      // already moved upstream by an İrsaliye (orders chain), in which case the
      // invoice is created with postsStock=false to avoid double-counting.
      if (invoice.postsStock) await this.postInvoiceStock(em, invoice)
      return invoice.id
    }).then((invId) => this.get(invId))
  }

  /** Reverse a posted invoice (ledger + stock), keeps the number. */
  async cancel(id: string): Promise<InvoiceDto> {
    const invoice = await this.findOrFail(id)
    if (invoice.status === 'cancelled') return this.get(id)
    if (invoice.status === 'draft') {
      throw new BadRequestException('Taslak fatura iptal edilemez; silebilirsiniz')
    }
    await this.invoices.manager.transaction(async (em) => {
      // Reverse any payments first (their kasa/banka + cari postings).
      const pays = await em.getRepository(InvoicePayment).find({ where: { invoiceId: id } })
      for (const p of pays) {
        if (p.financeTransactionId) await em.getRepository(FinanceTransaction).delete({ id: p.financeTransactionId })
        if (p.contactTransactionId) await em.getRepository(ContactTransaction).delete({ id: p.contactTransactionId })
      }
      await em.getRepository(InvoicePayment).delete({ invoiceId: id })
      // Reverse the issue postings.
      await em.getRepository(ContactTransaction).delete({ sourceModule: 'invoices', sourceId: id })
      await this.stockMovements.reverseSource(em, 'invoices', id) // reverse stock movements
      const inv = await em.getRepository(Invoice).findOneOrFail({ where: { id } })
      inv.status = 'cancelled'
      await em.getRepository(Invoice).save(inv)
    })
    return this.get(id)
  }

  /**
   * Post a stock movement per stock-tracked line on issue. Uses a system movement
   * type: sales → "Satış Çıkışı" (out), purchase/return → "Satın Alma Girişi" (in).
   * Movements are tagged with the invoice as source, so cancel reverses them.
   */
  private async postInvoiceStock(em: import('typeorm').EntityManager, invoice: Invoice): Promise<void> {
    const lines = await em.getRepository(InvoiceLine).find({ where: { invoiceId: invoice.id } })
    const productIds = [...new Set(lines.map((l) => l.productId).filter((x): x is string => !!x))]
    if (productIds.length === 0) return
    const products = await em.getRepository(Product).find({ where: { id: In(productIds) } })
    const tracked = new Map(products.map((p) => [p.id, p.trackStock]))
    const isSale = invoice.type === 'sales'
    const typeId = isSale
      ? await this.movementTypes.systemTypeId('Satış Çıkışı', 'out')
      : await this.movementTypes.systemTypeId('Satın Alma Girişi', 'in')

    for (const line of lines) {
      if (!line.productId || !tracked.get(line.productId)) continue
      await this.stockMovements.post(em, {
        productId: line.productId,
        branchId: invoice.branchId ?? null,
        movementTypeId: typeId,
        direction: isSale ? 'out' : 'in',
        quantity: line.quantity,
        unit: line.unit,
        date: invoice.date,
        description: `Fatura ${invoice.series}${invoice.number}`,
        sourceModule: 'invoices',
        sourceId: invoice.id,
      })
    }
  }

  private buildLines(invoiceId: string, inputs: CreateInvoiceDto['lines']): InvoiceLine[] {
    return inputs.map((l, i) => {
      const c = computeLine(l)
      return this.lines.create({
        invoiceId,
        productId: l.productId ?? null,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit ?? 'Adet',
        unitPrice: l.unitPrice,
        discountRate: l.discountRate ?? 0,
        vatRate: l.vatRate,
        withholdingCode: l.withholdingCode ?? null,
        lineNet: c.lineNet,
        lineVat: c.lineVat,
        lineWithholding: c.lineWithholding,
        lineTotal: c.lineTotal,
        sortOrder: l.sortOrder ?? i,
      })
    })
  }

  private async contactNameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)]
    const m = new Map<string, string>()
    if (unique.length === 0) return m
    for (const c of await this.contacts.find({ where: { id: In(unique) } })) m.set(c.id, c.name)
    return m
  }

  private async findOrFail(id: string): Promise<Invoice> {
    const invoice = await this.invoices.findOne({ where: { id } })
    if (!invoice) throw new NotFoundException('Fatura bulunamadı')
    return invoice
  }
}

/** Sales/return-to-customer → debit the contact; purchase → credit. */
function ledgerDebit(type: InvoiceType): boolean {
  return type === 'sales'
}

function defaultSeries(type: InvoiceType, date: string): string {
  const year = date?.slice(0, 4) || '0000'
  const prefix = type === 'purchase' ? 'ALS' : type === 'return' ? 'IAD' : 'STS'
  return `${prefix}${year}`
}

function toLineDto(l: InvoiceLine): InvoiceLineDto {
  return {
    id: l.id,
    invoiceId: l.invoiceId,
    productId: l.productId,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unitPrice,
    discountRate: l.discountRate,
    vatRate: l.vatRate,
    withholdingCode: l.withholdingCode,
    lineNet: l.lineNet,
    lineVat: l.lineVat,
    lineWithholding: l.lineWithholding,
    lineTotal: l.lineTotal,
    sortOrder: l.sortOrder,
  }
}

export function toPaymentDto(p: InvoicePayment, accountName: string | null): InvoicePaymentDto {
  return {
    id: p.id,
    invoiceId: p.invoiceId,
    contactId: p.contactId,
    date: p.date,
    amount: p.amount,
    method: p.method,
    cashAccountId: p.cashAccountId,
    bankAccountId: p.bankAccountId,
    accountName,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
  }
}

export function toInvoiceDto(
  i: Invoice,
  lines: InvoiceLine[],
  contactName: string | null,
  paidTotal = 0,
): InvoiceDto {
  return {
    id: i.id,
    type: i.type,
    series: i.series,
    number: i.number,
    ettn: i.ettn,
    date: i.date,
    dueDate: i.dueDate,
    contactId: i.contactId,
    contact: contactName ? { id: i.contactId, name: contactName } : null,
    branchId: i.branchId,
    currencyCode: i.currencyCode,
    exchangeRate: i.exchangeRate,
    status: i.status,
    eDocType: i.eDocType,
    faturaTipi: i.faturaTipi,
    senaryo: i.senaryo,
    notes: i.notes,
    subtotal: i.subtotal,
    discountTotal: i.discountTotal,
    vatBase: i.vatBase,
    vatTotal: i.vatTotal,
    withholdingTotal: i.withholdingTotal,
    grandTotal: i.grandTotal,
    vatSummary: i.vatSummary ?? [],
    lines: lines.map(toLineDto),
    paidTotal: Math.round((paidTotal + Number.EPSILON) * 100) / 100,
    remainingTotal: Math.round((i.grandTotal - paidTotal + Number.EPSILON) * 100) / 100,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  }
}
