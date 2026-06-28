import type { AxiosInstance } from 'axios'

import type {
  ContactGroupDto,
  CreateContactGroupRequest,
  UpdateContactGroupRequest,
} from './contact.dto'
import type { IContactGroupsService } from './contact-groups.service'

export class ContactGroupsApiClient implements IContactGroupsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<ContactGroupDto[]> {
    return (await this.http.get<ContactGroupDto[]>('/contacts/groups')).data
  }
  async get(id: string): Promise<ContactGroupDto> {
    return (await this.http.get<ContactGroupDto>(`/contacts/groups/${id}`)).data
  }
  async create(input: CreateContactGroupRequest): Promise<ContactGroupDto> {
    return (await this.http.post<ContactGroupDto>('/contacts/groups', input)).data
  }
  async update(id: string, input: UpdateContactGroupRequest): Promise<ContactGroupDto> {
    return (await this.http.patch<ContactGroupDto>(`/contacts/groups/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/contacts/groups/${id}`)
  }
}
