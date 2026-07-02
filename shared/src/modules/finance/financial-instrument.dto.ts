// Çek/Senet portföyü — one entity discriminated by `instrumentType`/`direction`
// (mirrors `orders`' `OrderDocument` kind/direction pattern) rather than two
// near-duplicate entities, since ~90% of fields are shared. On create, a linked
// `documents.Document` row is created automatically (see backend
// `financial-instruments.service.ts`) so every çek/senet is tracked in the
// generic Evrak module too — `documentId` is system-managed, never client-set.

export type InstrumentType = 'check' | 'note'
export const INSTRUMENT_TYPES: InstrumentType[] = ['check', 'note']

export type InstrumentDirection = 'received' | 'issued'
export const INSTRUMENT_DIRECTIONS: InstrumentDirection[] = ['received', 'issued']

export type InstrumentStatus =
  | 'open' // ikisi de — bekliyor
  | 'in_collection' // received — tahsile verildi (banka/factoring)
  | 'collected' // received — TERMINAL, finance IN + cari alacak
  | 'paid' // issued — TERMINAL, finance OUT + cari borç
  | 'bounced' // ikisi de — karşılıksız, status-only
  | 'endorsed' // received — ciro edildi, status-only (MVP)
  | 'pledged' // received — teminata verildi, status-only
  | 'cancelled' // ikisi de — TERMINAL, status-only, yalnız 'open'dan

export interface FinancialInstrumentDto {
  id: string
  instrumentType: InstrumentType
  direction: InstrumentDirection
  status: InstrumentStatus
  branchId: string | null
  contactId: string
  contactName: string | null
  amount: number
  currencyCode: string
  issueDate: string
  dueDate: string
  instrumentNo: string
  /** Yalnız çek. */
  bankName: string | null
  bankBranch: string | null
  accountNo: string | null
  drawerName: string | null
  notes: string | null
  cashAccountId: string | null
  bankAccountId: string | null
  financeTransactionId: string | null
  contactTransactionId: string | null
  /** Otomatik oluşturulan bağlı evrak (documents modülü) — sistem yönetir. */
  documentId: string | null
  createdById: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateFinancialInstrumentRequest {
  instrumentType: InstrumentType
  direction: InstrumentDirection
  branchId?: string | null
  contactId: string
  amount: number
  currencyCode?: string
  issueDate: string
  dueDate: string
  instrumentNo?: string
  bankName?: string | null
  bankBranch?: string | null
  accountNo?: string | null
  drawerName?: string | null
  notes?: string | null
}

export type UpdateFinancialInstrumentRequest = Partial<
  Omit<CreateFinancialInstrumentRequest, 'instrumentType' | 'direction'>
>

export interface InstrumentListQuery {
  direction?: InstrumentDirection
  instrumentType?: InstrumentType
  status?: InstrumentStatus
  contactId?: string
  from?: string
  to?: string
  search?: string
}

export interface SettleInstrumentRequest {
  cashAccountId?: string | null
  bankAccountId?: string | null
  date: string
  description?: string | null
}
