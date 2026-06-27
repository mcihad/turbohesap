import type {
  CashAccountDto,
  CreateCashAccountRequest,
  UpdateCashAccountRequest,
} from './finance.dto'

export interface ICashAccountsService {
  list(): Promise<CashAccountDto[]>
  get(id: string): Promise<CashAccountDto>
  create(input: CreateCashAccountRequest): Promise<CashAccountDto>
  update(id: string, input: UpdateCashAccountRequest): Promise<CashAccountDto>
  remove(id: string): Promise<void>
}
