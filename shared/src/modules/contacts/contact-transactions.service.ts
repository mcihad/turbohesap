import type {
  ContactTransactionDto,
  ContactTransactionListQuery,
  CreateContactTransactionRequest,
  UpdateContactTransactionRequest,
} from './contact-transaction.dto'

export interface IContactTransactionsService {
  list(query: ContactTransactionListQuery): Promise<ContactTransactionDto[]>
  get(id: string): Promise<ContactTransactionDto>
  create(input: CreateContactTransactionRequest): Promise<ContactTransactionDto>
  update(id: string, input: UpdateContactTransactionRequest): Promise<ContactTransactionDto>
  remove(id: string): Promise<void>
}
