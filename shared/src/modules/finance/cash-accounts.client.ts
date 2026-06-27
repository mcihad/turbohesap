import type { AxiosInstance } from 'axios'
import type {
  CashAccountDto,
  CreateCashAccountRequest,
  UpdateCashAccountRequest,
} from './finance.dto'
import type { ICashAccountsService } from './cash-accounts.service'

export class CashAccountsApiClient implements ICashAccountsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<CashAccountDto[]> {
    return (await this.http.get<CashAccountDto[]>('/finance/cash-accounts')).data
  }

  async get(id: string): Promise<CashAccountDto> {
    return (await this.http.get<CashAccountDto>(`/finance/cash-accounts/${id}`)).data
  }

  async create(input: CreateCashAccountRequest): Promise<CashAccountDto> {
    return (await this.http.post<CashAccountDto>('/finance/cash-accounts', input)).data
  }

  async update(id: string, input: UpdateCashAccountRequest): Promise<CashAccountDto> {
    return (await this.http.patch<CashAccountDto>(`/finance/cash-accounts/${id}`, input)).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/finance/cash-accounts/${id}`)
  }
}
