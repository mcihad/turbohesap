import type { AxiosInstance } from 'axios'

import type {
  ContactAddressDto,
  CreateContactAddressRequest,
  UpdateContactAddressRequest,
} from './contact.dto'
import type { IContactAddressesService } from './contact-addresses.service'

export class ContactAddressesApiClient implements IContactAddressesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(contactId: string): Promise<ContactAddressDto[]> {
    return (await this.http.get<ContactAddressDto[]>('/contacts/addresses', { params: { contactId } })).data
  }
  async get(id: string): Promise<ContactAddressDto> {
    return (await this.http.get<ContactAddressDto>(`/contacts/addresses/${id}`)).data
  }
  async create(input: CreateContactAddressRequest): Promise<ContactAddressDto> {
    return (await this.http.post<ContactAddressDto>('/contacts/addresses', input)).data
  }
  async update(id: string, input: UpdateContactAddressRequest): Promise<ContactAddressDto> {
    return (await this.http.patch<ContactAddressDto>(`/contacts/addresses/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/contacts/addresses/${id}`)
  }
}
