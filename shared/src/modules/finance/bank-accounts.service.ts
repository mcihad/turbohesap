import type {
  BankAccountDto,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
} from './finance.dto'

export interface IBankAccountsService {
  list(): Promise<BankAccountDto[]>
  get(id: string): Promise<BankAccountDto>
  create(input: CreateBankAccountRequest): Promise<BankAccountDto>
  update(id: string, input: UpdateBankAccountRequest): Promise<BankAccountDto>
  remove(id: string): Promise<void>
}
