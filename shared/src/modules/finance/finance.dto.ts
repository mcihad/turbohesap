// Cash Account (Kasa) DTOs
export interface CashAccountDto {
  id: string
  name: string
  currency: string
  openingBalance: number
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
