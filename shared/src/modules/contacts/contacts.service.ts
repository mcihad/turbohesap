import type { Page } from '../../core/pagination'
import type {
  ContactDto,
  ContactListQuery,
  ConvertLeadRequest,
  CreateContactRequest,
  UpdateContactRequest,
} from './contact.dto'
import type {
  BulkContactRequest,
  BulkResultDto,
  ImportContactsRequest,
  ImportResultDto,
} from './crm-fields.dto'

export interface IContactsService {
  /** Full array — used by pickers/dropdowns/dialogs that need every contact. */
  list(query?: ContactListQuery): Promise<ContactDto[]>
  /** Server-paginated + filtered + sorted — used by the DataGrid (server mode). */
  listPage(query?: ContactListQuery): Promise<Page<ContactDto>>
  get(id: string): Promise<ContactDto>
  create(input: CreateContactRequest): Promise<ContactDto>
  update(id: string, input: UpdateContactRequest): Promise<ContactDto>
  /** Convert a lead into a customer/supplier (optionally creating a deal). */
  convert(id: string, input: ConvertLeadRequest): Promise<ContactDto>
  /** Apply a bulk operation (assign owner / tag / active / group) to many contacts. */
  bulk(input: BulkContactRequest): Promise<BulkResultDto>
  /** Bulk-import contacts (from CSV). */
  importContacts(input: ImportContactsRequest): Promise<ImportResultDto>
  remove(id: string): Promise<void>
}
