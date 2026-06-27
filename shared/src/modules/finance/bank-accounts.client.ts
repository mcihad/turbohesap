import type { AxiosInstance } from 'axios'
import type {
  BankAccountDto,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
} from './finance.dto'
import type { IBankAccountsService } from './bank-accounts.service'

export class BankAccountsApiClient implements IBankAccountsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<BankAccountDto[]> {
    return (await this.http.get<BankAccountDto[]>('/finance/bank-accounts')).data
  }

  async get(id: string): Promise<BankAccountDto> {
    return (await this.http.get<BankAccountDto>(`/finance/bank-accounts/${id}`)).data
  }

  async create(input: CreateBankAccountRequest): Promise<BankAccountDto> {
    return (await this.http.post<BankAccountDto>('/finance/bank-accounts', input)).data
  }

  async update(id: string, input: UpdateBankAccountRequest): Promise<BankAccountDto> {
    return (await this.http.patch<BankAccountDto>(`/finance/bank-accounts/${id}`, input)).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/finance/bank-accounts/${id}`)
  }
}
