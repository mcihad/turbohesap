import type { AxiosInstance } from 'axios'
import type {
  FinanceTransactionDto,
  CreateFinanceTransactionRequest,
  UpdateFinanceTransactionRequest,
} from './finance.dto'
import type { IFinanceTransactionsService } from './finance-transactions.service'

export class FinanceTransactionsApiClient implements IFinanceTransactionsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: { cashAccountId?: string; bankAccountId?: string }): Promise<FinanceTransactionDto[]> {
    return (await this.http.get<FinanceTransactionDto[]>('/finance/transactions', { params: query })).data
  }

  async get(id: string): Promise<FinanceTransactionDto> {
    return (await this.http.get<FinanceTransactionDto>(`/finance/transactions/${id}`)).data
  }

  async create(input: CreateFinanceTransactionRequest): Promise<FinanceTransactionDto> {
    return (await this.http.post<FinanceTransactionDto>('/finance/transactions', input)).data
  }

  async update(id: string, input: UpdateFinanceTransactionRequest): Promise<FinanceTransactionDto> {
    return (await this.http.patch<FinanceTransactionDto>(`/finance/transactions/${id}`, input)).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/finance/transactions/${id}`)
  }
}
