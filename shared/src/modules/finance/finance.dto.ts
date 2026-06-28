// Cash Account (Kasa) DTOs
export interface CashAccountDto {
  id: string
  name: string
  currency: string
  openingBalance: number
  balance: number // Computed balance (openingBalance + sum of transactions)
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCashAccountRequest {
  name: string
  currency: string
  openingBalance?: number
  description?: string
  isActive?: boolean
}

export type UpdateCashAccountRequest = Partial<CreateCashAccountRequest>

// Bank Account (Banka) DTOs
export interface BankAccountDto {
  id: string
  name: string
  bankName: string
  branchName: string
  branchCode: string
  accountNumber: string
  iban: string
  currency: string
  openingBalance: number
  balance: number // Computed balance (openingBalance + sum of transactions)
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateBankAccountRequest {
  name: string
  bankName: string
  branchName?: string
  branchCode?: string
  accountNumber?: string
  iban: string
  currency: string
  openingBalance?: number
  description?: string
  isActive?: boolean
}

export type UpdateBankAccountRequest = Partial<CreateBankAccountRequest>

// Finance Transaction (Kasa/Banka Hareketi) DTOs
export type FinanceTransactionType = 'in' | 'out'

export interface FinanceTransactionDto {
  id: string
  cashAccountId: string | null
  bankAccountId: string | null
  /** Linked cari (contact) — the counterparty of a tahsilat/ödeme. */
  contactId: string | null
  type: FinanceTransactionType
  amount: number
  date: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface CreateFinanceTransactionRequest {
  cashAccountId?: string | null
  bankAccountId?: string | null
  contactId?: string | null
  type: FinanceTransactionType
  amount: number
  date: string
  description?: string
}

export type UpdateFinanceTransactionRequest = Partial<CreateFinanceTransactionRequest>
