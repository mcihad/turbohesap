import type { AxiosInstance } from 'axios'

import type {
  ContactPersonDto,
  CreateContactPersonRequest,
  UpdateContactPersonRequest,
} from './contact.dto'
import type { IContactPersonsService } from './contact-persons.service'

export class ContactPersonsApiClient implements IContactPersonsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(contactId: string): Promise<ContactPersonDto[]> {
    return (await this.http.get<ContactPersonDto[]>('/contacts/persons', { params: { contactId } })).data
  }
  async get(id: string): Promise<ContactPersonDto> {
    return (await this.http.get<ContactPersonDto>(`/contacts/persons/${id}`)).data
  }
  async create(input: CreateContactPersonRequest): Promise<ContactPersonDto> {
    return (await this.http.post<ContactPersonDto>('/contacts/persons', input)).data
  }
  async update(id: string, input: UpdateContactPersonRequest): Promise<ContactPersonDto> {
    return (await this.http.patch<ContactPersonDto>(`/contacts/persons/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/contacts/persons/${id}`)
  }
}
