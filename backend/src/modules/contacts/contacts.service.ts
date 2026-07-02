import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type {
  BalanceSide,
  BulkContactRequest,
  BulkResultDto,
  ContactDto,
  ContactListQuery,
  ConvertLeadRequest,
  ImportContactsRequest,
  ImportResultDto,
  Page,
} from '@turbohesap/shared'

import { applyListQuery, type ListSpec } from '../../common/list/apply-list-query'
import { Contact } from './entities/contact.entity'
import { ContactGroup } from './entities/contact-group.entity'
import { ContactTransaction } from './entities/contact-transaction.entity'
import { ContactPerson } from './entities/contact-person.entity'
import { ContactAddress } from './entities/contact-address.entity'
import { Opportunity } from './entities/opportunity.entity'
import { User } from '../iam/entities/user.entity'
import { OpportunitiesService } from './opportunities.service'
import { ownerNameMap } from './user-name.util'
import type { CreateContactDto, UpdateContactDto } from './dto/contact.dto'

interface ContactAggregates {
  groupName: string | null
  ownerName: string | null
  ledger: number // Σ debit − Σ credit
  personCount: number
  addressCount: number
  openOpportunityCount: number
}

// Allowlist of filterable/sortable contact columns for the server-side list.
// Column identifiers are developer-authored — the request never supplies them.
const CONTACT_LIST_SPEC: ListSpec = {
  fields: {
    code: { column: 'c.code', type: 'text', filterable: true, sortable: true },
    name: { column: 'c.name', type: 'text', filterable: true, sortable: true },
    role: { column: 'c.role', type: 'enum', filterable: true, sortable: true },
    contactType: { column: 'c.contactType', type: 'enum', filterable: true, sortable: true },
    groupId: { column: 'c.groupId', type: 'uuid', filterable: true, sortable: false },
    taxNumber: { column: 'c.taxNumber', type: 'text', filterable: true, sortable: true },
    phone: { column: 'c.phone', type: 'text', filterable: true, sortable: false },
    email: { column: 'c.email', type: 'text', filterable: true, sortable: false },
    isActive: { column: 'c.isActive', type: 'boolean', filterable: true, sortable: true },
    createdAt: { column: 'c.createdAt', type: 'date', filterable: true, sortable: true },
  },
  searchColumns: ['c.name', 'c.code', 'c.taxNumber'],
  defaultSort: [{ field: 'name', dir: 'asc' }],
}

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(ContactGroup) private readonly groups: Repository<ContactGroup>,
    @InjectRepository(ContactTransaction) private readonly transactions: Repository<ContactTransaction>,
    @InjectRepository(ContactPerson) private readonly persons: Repository<ContactPerson>,
    @InjectRepository(ContactAddress) private readonly addresses: Repository<ContactAddress>,
    @InjectRepository(Opportunity) private readonly opportunities: Repository<Opportunity>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly opportunitiesService: OpportunitiesService,
  ) {}

  /** Base query with the server-scoped legacy filters applied. */
  private listBaseQb(query?: ContactListQuery, currentUserId?: string) {
    const qb = this.contacts.createQueryBuilder('c')
    if (query?.role) qb.andWhere('c.role = :role', { role: query.role })
    if (query?.groupId) qb.andWhere('c.groupId = :groupId', { groupId: query.groupId })
    if (query?.ownerId) qb.andWhere('c.ownerId = :ownerId', { ownerId: query.ownerId })
    else if (query?.mine && currentUserId)
      qb.andWhere('c.ownerId = :ownerId', { ownerId: currentUserId })
    if (query?.tag) qb.andWhere('c.tags @> :tag::jsonb', { tag: JSON.stringify([query.tag]) })
    if (query?.activeOnly) qb.andWhere('c.isActive = true')
    return qb
  }

  /** Enrich a page/list of contact rows with computed aggregates. */
  private async enrichContacts(rows: Contact[]): Promise<ContactDto[]> {
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.id)
    const [ledgerMap, personMap, addressMap, oppMap, groupMap, ownerMap] = await Promise.all([
      this.ledgerMap(ids),
      this.countMap(this.persons, ids),
      this.countMap(this.addresses, ids),
      this.openOpportunityMap(ids),
      this.groupNameMap(rows),
      ownerNameMap(this.users, rows.map((r) => r.ownerId)),
    ])
    return rows.map((r) =>
      toContactDto(r, {
        groupName: r.groupId ? groupMap.get(r.groupId) ?? null : null,
        ownerName: r.ownerId ? ownerMap.get(r.ownerId) ?? null : null,
        ledger: ledgerMap.get(r.id) ?? 0,
        personCount: personMap.get(r.id) ?? 0,
        addressCount: addressMap.get(r.id) ?? 0,
        openOpportunityCount: oppMap.get(r.id) ?? 0,
      }),
    )
  }

  /** Full array — for pickers/dropdowns (search still applied for typeaheads). */
  async list(query?: ContactListQuery, currentUserId?: string): Promise<ContactDto[]> {
    const qb = this.listBaseQb(query, currentUserId)
    if (query?.search) {
      qb.andWhere('(c.name ILIKE :q OR c.code ILIKE :q OR c.taxNumber ILIKE :q)', {
        q: `%${query.search}%`,
      })
    }
    qb.orderBy('c.name', 'ASC')
    return this.enrichContacts(await qb.getMany())
  }

  /** Server-paginated + filtered + sorted — for the DataGrid (server mode). */
  async listPage(query?: ContactListQuery, currentUserId?: string): Promise<Page<ContactDto>> {
    const qb = this.listBaseQb(query, currentUserId)
    const { page, pageSize } = applyListQuery(qb, query ?? {}, CONTACT_LIST_SPEC)
    const [rows, total] = await qb.getManyAndCount()
    return { items: await this.enrichContacts(rows), total, page, pageSize }
  }

  async get(id: string): Promise<ContactDto> {
    const c = await this.findOrFail(id)
    const [ledger, personCount, addressCount, openOpportunityCount, group, ownerMap] =
      await Promise.all([
        this.ledgerFor(id),
        this.persons.count({ where: { contactId: id } }),
        this.addresses.count({ where: { contactId: id } }),
        this.opportunities.count({ where: { contactId: id, stage: In(OPEN_STAGES) } }),
        c.groupId ? this.groups.findOne({ where: { id: c.groupId } }) : Promise.resolve(null),
        ownerNameMap(this.users, [c.ownerId]),
      ])
    return toContactDto(c, {
      groupName: group?.name ?? null,
      ownerName: c.ownerId ? ownerMap.get(c.ownerId) ?? null : null,
      ledger,
      personCount,
      addressCount,
      openOpportunityCount,
    })
  }

  async create(dto: CreateContactDto): Promise<ContactDto> {
    if (dto.groupId) await this.assertGroup(dto.groupId)
    const code = (dto.code?.trim() || (await this.nextCode())).trim()
    if (await this.contacts.findOne({ where: { code } })) {
      throw new BadRequestException('Bu cari kodu zaten kullanımda')
    }
    const contact = this.contacts.create({
      code,
      contactType: dto.contactType,
      role: dto.role,
      name: dto.name.trim(),
      taxOffice: dto.taxOffice ?? null,
      taxNumber: dto.taxNumber ?? null,
      nationalId: dto.nationalId ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      mobile: dto.mobile ?? null,
      website: dto.website ?? null,
      currencyCode: dto.currencyCode ?? 'TRY',
      openingBalance: dto.openingBalance ?? 0,
      openingBalanceSide: dto.openingBalanceSide ?? 'debit',
      creditLimit: dto.creditLimit ?? 0,
      paymentTermDays: dto.paymentTermDays ?? 0,
      groupId: dto.groupId ?? null,
      ownerId: dto.ownerId ?? null,
      leadSource: dto.leadSource ?? null,
      leadStatus: dto.leadStatus ?? null,
      tags: dto.tags ?? [],
      iban: dto.iban ?? null,
      bankName: dto.bankName ?? null,
      branchId: dto.branchId ?? null,
      notes: dto.notes ?? null,
      attributes: dto.attributes ?? {},
      isActive: dto.isActive ?? true,
    })
    const saved = await this.contacts.save(contact)
    return this.get(saved.id)
  }

  async update(id: string, dto: UpdateContactDto): Promise<ContactDto> {
    const contact = await this.findOrFail(id)
    if (dto.groupId !== undefined && dto.groupId) await this.assertGroup(dto.groupId)
    if (dto.code !== undefined && dto.code.trim() && dto.code.trim() !== contact.code) {
      const clash = await this.contacts.findOne({ where: { code: dto.code.trim() } })
      if (clash && clash.id !== id) throw new BadRequestException('Bu cari kodu zaten kullanımda')
    }
    Object.assign(contact, {
      ...dto,
      name: dto.name?.trim() ?? contact.name,
      code: dto.code?.trim() ?? contact.code,
    })
    await this.contacts.save(contact)
    return this.get(id)
  }

  async convert(id: string, dto: ConvertLeadRequest, actor: string | null): Promise<ContactDto> {
    const contact = await this.findOrFail(id)
    contact.role = dto.toRole ?? 'customer'
    if (!contact.leadStatus) contact.leadStatus = 'converted'
    await this.contacts.save(contact)
    if (dto.createOpportunity && dto.opportunity?.name) {
      await this.opportunitiesService.create(
        {
          contactId: id,
          name: dto.opportunity.name,
          pipelineId: dto.opportunity.pipelineId,
          stageId: dto.opportunity.stageId,
          amount: dto.opportunity.amount,
          expectedCloseDate: dto.opportunity.expectedCloseDate ?? null,
          ownerId: contact.ownerId ?? actor,
        },
        actor,
      )
    }
    return this.get(id)
  }

  async bulk(dto: BulkContactRequest): Promise<BulkResultDto> {
    if (!dto.ids?.length) return { updated: 0 }
    const rows = await this.contacts.find({ where: { id: In(dto.ids) } })
    for (const c of rows) {
      switch (dto.op) {
        case 'assignOwner':
          c.ownerId = dto.value || null
          break
        case 'setGroup':
          c.groupId = dto.value || null
          break
        case 'setActive':
          c.isActive = dto.value === 'true'
          break
        case 'addTag':
          if (dto.value && !c.tags?.includes(dto.value)) c.tags = [...(c.tags ?? []), dto.value]
          break
        case 'removeTag':
          c.tags = (c.tags ?? []).filter((t) => t !== dto.value)
          break
      }
    }
    await this.contacts.save(rows)
    return { updated: rows.length }
  }

  async importContacts(dto: ImportContactsRequest): Promise<ImportResultDto> {
    const result: ImportResultDto = { created: 0, skipped: 0, errors: [] }
    for (const row of dto.contacts ?? []) {
      const name = row.name?.trim()
      if (!name) {
        result.skipped++
        continue
      }
      try {
        await this.create({
          contactType: row.contactType ?? 'company',
          role: row.role ?? 'customer',
          name,
          code: row.code,
          taxNumber: row.taxNumber ?? null,
          email: row.email ?? null,
          phone: row.phone ?? null,
          mobile: row.mobile ?? null,
        })
        result.created++
      } catch (e) {
        result.skipped++
        result.errors.push(`${name}: ${(e as Error).message}`)
      }
    }
    return result
  }

  async remove(id: string): Promise<void> {
    const contact = await this.findOrFail(id)
    const txCount = await this.transactions.count({ where: { contactId: id } })
    if (txCount > 0) {
      throw new BadRequestException('Hareketi olan cari silinemez. Önce hareketleri silin veya cariyi pasife alın.')
    }
    // Clean up the contact's owned sub-records (no FK cascade defined).
    await Promise.all([
      this.persons.delete({ contactId: id }),
      this.addresses.delete({ contactId: id }),
      this.opportunities.delete({ contactId: id }),
    ])
    await this.contacts.remove(contact)
  }

  // ── aggregate helpers ─────────────────────────────────────────────────────
  private async ledgerFor(contactId: string): Promise<number> {
    const res = await this.transactions
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.debit - t.credit), 0)', 'net')
      .where('t.contactId = :contactId', { contactId })
      .getRawOne<{ net: string }>()
    return res ? Number(res.net) : 0
  }

  private async ledgerMap(ids: string[]): Promise<Map<string, number>> {
    const rows = await this.transactions
      .createQueryBuilder('t')
      .select('t.contactId', 'cid')
      .addSelect('SUM(t.debit - t.credit)', 'net')
      .where('t.contactId IN (:...ids)', { ids })
      .groupBy('t.contactId')
      .getRawMany<{ cid: string; net: string }>()
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.cid, Number(r.net))
    return m
  }

  private async countMap(
    repo: Repository<ContactPerson | ContactAddress>,
    ids: string[],
  ): Promise<Map<string, number>> {
    const rows = await repo
      .createQueryBuilder('x')
      .select('x.contactId', 'cid')
      .addSelect('COUNT(*)', 'cnt')
      .where('x.contactId IN (:...ids)', { ids })
      .groupBy('x.contactId')
      .getRawMany<{ cid: string; cnt: string }>()
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.cid, Number(r.cnt))
    return m
  }

  private async openOpportunityMap(ids: string[]): Promise<Map<string, number>> {
    const rows = await this.opportunities
      .createQueryBuilder('o')
      .select('o.contactId', 'cid')
      .addSelect('COUNT(*)', 'cnt')
      .where('o.contactId IN (:...ids)', { ids })
      .andWhere('o.stage IN (:...stages)', { stages: OPEN_STAGES })
      .groupBy('o.contactId')
      .getRawMany<{ cid: string; cnt: string }>()
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.cid, Number(r.cnt))
    return m
  }

  private async groupNameMap(rows: Contact[]): Promise<Map<string, string>> {
    const groupIds = [...new Set(rows.map((r) => r.groupId).filter((x): x is string => !!x))]
    const m = new Map<string, string>()
    if (groupIds.length === 0) return m
    const groups = await this.groups.find({ where: { id: In(groupIds) } })
    for (const g of groups) m.set(g.id, g.name)
    return m
  }

  private async assertGroup(groupId: string): Promise<void> {
    if (!(await this.groups.findOne({ where: { id: groupId } }))) {
      throw new BadRequestException('Cari grubu bulunamadı')
    }
  }

  private async nextCode(): Promise<string> {
    const count = await this.contacts.count()
    return `CARI-${String(count + 1).padStart(5, '0')}`
  }

  private async findOrFail(id: string): Promise<Contact> {
    const contact = await this.contacts.findOne({ where: { id } })
    if (!contact) throw new NotFoundException('Cari bulunamadı')
    return contact
  }
}

// Open (non-closed) opportunity stages — used for the open-opportunity count.
const OPEN_STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation']

export function netToBalance(net: number): { balance: number; side: BalanceSide } {
  return { balance: Math.abs(net), side: net >= 0 ? 'debit' : 'credit' }
}

export function toContactDto(c: Contact, agg: ContactAggregates): ContactDto {
  const opening = c.openingBalanceSide === 'debit' ? c.openingBalance : -c.openingBalance
  const net = opening + agg.ledger
  const { balance, side } = netToBalance(net)
  return {
    id: c.id,
    code: c.code,
    contactType: c.contactType,
    role: c.role,
    name: c.name,
    taxOffice: c.taxOffice,
    taxNumber: c.taxNumber,
    nationalId: c.nationalId,
    email: c.email,
    phone: c.phone,
    mobile: c.mobile,
    website: c.website,
    currencyCode: c.currencyCode,
    openingBalance: c.openingBalance,
    openingBalanceSide: c.openingBalanceSide,
    creditLimit: c.creditLimit,
    paymentTermDays: c.paymentTermDays,
    groupId: c.groupId,
    group: c.groupId ? { id: c.groupId, name: agg.groupName ?? '' } : null,
    ownerId: c.ownerId,
    owner: c.ownerId ? { id: c.ownerId, name: agg.ownerName ?? '' } : null,
    leadSource: c.leadSource,
    leadStatus: c.leadStatus,
    attributes: c.attributes ?? {},
    tags: c.tags ?? [],
    iban: c.iban,
    bankName: c.bankName,
    branchId: c.branchId,
    notes: c.notes,
    isActive: c.isActive,
    balance,
    balanceSide: side,
    personCount: agg.personCount,
    addressCount: agg.addressCount,
    openOpportunityCount: agg.openOpportunityCount,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}
