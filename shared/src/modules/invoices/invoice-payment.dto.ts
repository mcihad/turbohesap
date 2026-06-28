// Fatura tahsilat/ödeme — links an invoice to a cash/bank movement. Creating one
// posts BOTH a finance transaction (kasa/banka bakiyesi) and a cari ledger entry
// (cari bakiyesi kapanır), and updates the invoice's paid/remaining + status.

export type PaymentMethod = 'cash' | 'bank'
export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank']

export interface InvoicePaymentDto {
  id: string
  invoiceId: string
  contactId: string
  date: string
  amount: number
  method: PaymentMethod
  cashAccountId: string | null
  bankAccountId: string | null
  /** Display name of the cash/bank account (list/get convenience). */
  accountName: string | null
  description: string | null
  createdAt: string
}

export interface CreateInvoicePaymentRequest {
  date: string
  amount: number
  method: PaymentMethod
  cashAccountId?: string | null
  bankAccountId?: string | null
  description?: string | null
}
