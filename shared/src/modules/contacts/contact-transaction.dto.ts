// Cari Hareket (contact ledger) — an immutable-style debit/credit ledger per
// contact. The contact balance is computed from these (Σ debit − Σ credit), in
// the ERPNext GL-entry style. This powers the Cari Ekstre (account statement).

export type ContactDocumentType =
  | 'invoice' // Fatura
  | 'payment' // Ödeme (we pay a supplier)
  | 'receipt' // Tahsilat (we collect from a customer)
  | 'opening' // Açılış
  | 'adjustment' // Düzeltme
  | 'return' // İade
  | 'check' // Çek tahsilat/ödemesi
  | 'note' // Senet tahsilat/ödemesi

export const CONTACT_DOCUMENT_TYPES: ContactDocumentType[] = [
  'invoice',
  'payment',
  'receipt',
  'opening',
  'adjustment',
  'return',
  'check',
  'note',
]

export interface ContactTransactionDto {
  id: string
  contactId: string
  date: string
  documentType: ContactDocumentType
  documentNo: string | null
  description: string | null
  /** Borç. */
  debit: number
  /** Alacak. */
  credit: number
  currencyCode: string
  /** Döviz kuru → base currency. */
  exchangeRate: number
  /** Vade tarihi. */
  dueDate: string | null
  /** Running balance up to and including this row (computed, statement order). */
  runningBalance: number
  /** Origin document, when posted from another module (e.g. cashbank, sales). */
  sourceModule: string | null
  sourceId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateContactTransactionRequest {
  contactId: string
  date: string
  documentType: ContactDocumentType
  debit?: number
  credit?: number
  documentNo?: string | null
  description?: string | null
  currencyCode?: string
  exchangeRate?: number
  dueDate?: string | null
  sourceModule?: string | null
  sourceId?: string | null
}
export type UpdateContactTransactionRequest = Partial<
  Omit<CreateContactTransactionRequest, 'contactId'>
>

export interface ContactTransactionListQuery {
  contactId: string
  from?: string
  to?: string
}
