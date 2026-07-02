import type { AxiosInstance } from 'axios'

import type { Page } from '../../core/pagination'
import { encodeListQuery } from '../../core/list-query'
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
import type { IContactsService } from './contacts.service'

export class ContactsApiClient implements IContactsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: ContactListQuery): Promise<ContactDto[]> {
    return (await this.http.get<ContactDto[]>('/contacts/contacts', { params: query })).data
  }
  async listPage(query?: ContactListQuery): Promise<Page<ContactDto>> {
    const params = {
      ...(query?.role ? { role: query.role } : {}),
      ...(query?.groupId ? { groupId: query.groupId } : {}),
      ...(query?.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query?.mine ? { mine: 'true' } : {}),
      ...(query?.tag ? { tag: query.tag } : {}),
      ...(query?.activeOnly ? { activeOnly: 'true' } : {}),
      ...encodeListQuery(query ?? {}),
    }
    return (await this.http.get<Page<ContactDto>>('/contacts/contacts/paged', { params })).data
  }
  async get(id: string): Promise<ContactDto> {
    return (await this.http.get<ContactDto>(`/contacts/contacts/${id}`)).data
  }
  async create(input: CreateContactRequest): Promise<ContactDto> {
    return (await this.http.post<ContactDto>('/contacts/contacts', input)).data
  }
  async update(id: string, input: UpdateContactRequest): Promise<ContactDto> {
    return (await this.http.patch<ContactDto>(`/contacts/contacts/${id}`, input)).data
  }
  async convert(id: string, input: ConvertLeadRequest): Promise<ContactDto> {
    return (await this.http.post<ContactDto>(`/contacts/contacts/${id}/convert`, input)).data
  }
  async bulk(input: BulkContactRequest): Promise<BulkResultDto> {
    return (await this.http.post<BulkResultDto>('/contacts/contacts/bulk', input)).data
  }
  async importContacts(input: ImportContactsRequest): Promise<ImportResultDto> {
    return (await this.http.post<ImportResultDto>('/contacts/contacts/import', input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/contacts/contacts/${id}`)
  }
}
