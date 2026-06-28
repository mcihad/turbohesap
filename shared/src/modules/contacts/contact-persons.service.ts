import type {
  ContactPersonDto,
  CreateContactPersonRequest,
  UpdateContactPersonRequest,
} from './contact.dto'

export interface IContactPersonsService {
  list(contactId: string): Promise<ContactPersonDto[]>
  get(id: string): Promise<ContactPersonDto>
  create(input: CreateContactPersonRequest): Promise<ContactPersonDto>
  update(id: string, input: UpdateContactPersonRequest): Promise<ContactPersonDto>
  remove(id: string): Promise<void>
}
