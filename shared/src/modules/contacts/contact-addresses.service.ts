import type {
  ContactAddressDto,
  CreateContactAddressRequest,
  UpdateContactAddressRequest,
} from './contact.dto'

export interface IContactAddressesService {
  list(contactId: string): Promise<ContactAddressDto[]>
  get(id: string): Promise<ContactAddressDto>
  create(input: CreateContactAddressRequest): Promise<ContactAddressDto>
  update(id: string, input: UpdateContactAddressRequest): Promise<ContactAddressDto>
  remove(id: string): Promise<void>
}
