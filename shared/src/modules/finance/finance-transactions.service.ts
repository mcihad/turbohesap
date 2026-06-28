import type {
  FinanceTransactionDto,
  CreateFinanceTransactionRequest,
  UpdateFinanceTransactionRequest,
} from './finance.dto'

export interface IFinanceTransactionsService {
  list(query?: { cashAccountId?: string; bankAccountId?: string }): Promise<FinanceTransactionDto[]>
  get(id: string): Promise<FinanceTransactionDto>
  create(input: CreateFinanceTransactionRequest): Promise<FinanceTransactionDto>
  update(id: string, input: UpdateFinanceTransactionRequest): Promise<FinanceTransactionDto>
  remove(id: string): Promise<void>
}
