import { netToBalance, toContactDto } from './contacts.service'
import { toOpportunityDto } from './opportunities.service'
import { toContactTransactionDto } from './contact-transactions.service'
import type { Contact } from './entities/contact.entity'
import type { Opportunity } from './entities/opportunity.entity'
import type { ContactTransaction } from './entities/contact-transaction.entity'

const NOW = new Date('2026-01-01T00:00:00.000Z')

describe('contacts computed balances', () => {
  describe('netToBalance', () => {
    it('positive net is a debit (borçlu) balance', () => {
      expect(netToBalance(150)).toEqual({ balance: 150, side: 'debit' })
    })
    it('negative net is a credit (alacaklı) balance, magnitude absolute', () => {
      expect(netToBalance(-75.5)).toEqual({ balance: 75.5, side: 'credit' })
    })
    it('zero is debit side', () => {
      expect(netToBalance(0)).toEqual({ balance: 0, side: 'debit' })
    })
  })

  describe('toContactDto', () => {
    const base = {
      id: 'c1', code: 'CARI-1', contactType: 'company', role: 'customer', name: 'ACME',
      taxOffice: null, taxNumber: null, nationalId: null, email: null, phone: null,
      mobile: null, website: null, currencyCode: 'TRY', creditLimit: 0, paymentTermDays: 0,
      groupId: null, tags: [], iban: null, bankName: null, branchId: null, notes: null,
      isActive: true, createdAt: NOW, updatedAt: NOW,
    } as unknown as Contact

    const agg = { groupName: null, ownerName: null, ledger: 0, personCount: 0, addressCount: 0, openOpportunityCount: 0 }

    it('opening debit + ledger sums on the debit side', () => {
      const c = { ...base, openingBalance: 100, openingBalanceSide: 'debit' } as Contact
      const dto = toContactDto(c, { ...agg, ledger: 50 }) // 100 + 50
      expect(dto.balance).toBe(150)
      expect(dto.balanceSide).toBe('debit')
    })

    it('opening credit flips the sign', () => {
      const c = { ...base, openingBalance: 100, openingBalanceSide: 'credit' } as Contact
      const dto = toContactDto(c, { ...agg, ledger: 30 }) // -100 + 30 = -70
      expect(dto.balance).toBe(70)
      expect(dto.balanceSide).toBe('credit')
    })
  })

  describe('toContactTransactionDto', () => {
    it('passes through the supplied running balance', () => {
      const t = {
        id: 't1', contactId: 'c1', date: '2026-01-02', documentType: 'invoice',
        documentNo: null, description: null, debit: 200, credit: 0, currencyCode: 'TRY',
        exchangeRate: 1, dueDate: null, sourceModule: null, sourceId: null,
        createdAt: NOW, updatedAt: NOW,
      } as unknown as ContactTransaction
      const dto = toContactTransactionDto(t, 200)
      expect(dto.runningBalance).toBe(200)
      expect(dto.debit).toBe(200)
    })
  })

  describe('toOpportunityDto', () => {
    const base = {
      id: 'o1', contactId: 'c1', contactPersonId: null, name: 'Deal', currencyCode: 'TRY',
      expectedCloseDate: null, source: null, ownerId: null, notes: null,
      winReason: null, lossReason: null, stageEnteredAt: NOW, createdAt: NOW, updatedAt: NOW,
    } as unknown as Opportunity

    // Minimal stage stub — toOpportunityDto only reads type/key/name/color/rottingDays.
    const stageOf = (type: 'open' | 'won' | 'lost') =>
      ({ key: type, name: type, type, color: '#000', rottingDays: 0 } as never)
    const ctx = (contactName: string | null, type: 'open' | 'won' | 'lost') => ({
      contactName,
      ownerName: null,
      stage: stageOf(type),
      lastActivityAt: null,
      now: NOW.getTime(),
    })

    it('computes expectedRevenue = amount × probability%', () => {
      const o = { ...base, stage: 'proposal', amount: 1000, probability: 50 } as Opportunity
      const dto = toOpportunityDto(o, ctx('ACME', 'open'))
      expect(dto.expectedRevenue).toBe(500)
      expect(dto.isClosed).toBe(false)
      expect(dto.isWon).toBe(false)
      expect(dto.contact).toEqual({ id: 'c1', name: 'ACME' })
    })

    it('won stage is closed and won', () => {
      const o = { ...base, stage: 'won', amount: 1000, probability: 100 } as Opportunity
      const dto = toOpportunityDto(o, ctx(null, 'won'))
      expect(dto.isClosed).toBe(true)
      expect(dto.isWon).toBe(true)
      expect(dto.contact).toBeNull()
    })

    it('lost stage is closed but not won', () => {
      const o = { ...base, stage: 'lost', amount: 1000, probability: 0 } as Opportunity
      const dto = toOpportunityDto(o, ctx('ACME', 'lost'))
      expect(dto.isClosed).toBe(true)
      expect(dto.isWon).toBe(false)
    })
  })
})
