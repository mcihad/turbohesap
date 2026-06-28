import type { AxiosInstance } from 'axios'

import type {
  ContactTransactionDto,
  ContactTransactionListQuery,
  CreateContactTransactionRequest,
  UpdateContactTransactionRequest,
} from './contact-transaction.dto'
import type { IContactTransactionsService } from './contact-transactions.service'

export class ContactTransactionsApiClient implements IContactTransactionsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query: ContactTransactionListQuery): Promise<ContactTransactionDto[]> {
    return (await this.http.get<ContactTransactionDto[]>('/contacts/transactions', { params: query })).data
  }
  async get(id: string): Promise<ContactTransactionDto> {
    return (await this.http.get<ContactTransactionDto>(`/contacts/transactions/${id}`)).data
  }
  async create(input: CreateContactTransactionRequest): Promise<ContactTransactionDto> {
    return (await this.http.post<ContactTransactionDto>('/contacts/transactions', input)).data
  }
  async update(id: string, input: UpdateContactTransactionRequest): Promise<ContactTransactionDto> {
    return (await this.http.patch<ContactTransactionDto>(`/contacts/transactions/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/contacts/transactions/${id}`)
  }
}
