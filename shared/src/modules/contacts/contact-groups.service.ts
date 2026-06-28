import type {
  ContactGroupDto,
  CreateContactGroupRequest,
  UpdateContactGroupRequest,
} from './contact.dto'

export interface IContactGroupsService {
  list(): Promise<ContactGroupDto[]>
  get(id: string): Promise<ContactGroupDto>
  create(input: CreateContactGroupRequest): Promise<ContactGroupDto>
  update(id: string, input: UpdateContactGroupRequest): Promise<ContactGroupDto>
  remove(id: string): Promise<void>
}
