import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserDto,
} from './user.dto'

// Contract for the IAM users resource (/api/iam/users).
export interface IUsersService {
  list(): Promise<UserDto[]>
  get(id: string): Promise<UserDto>
  create(input: CreateUserRequest): Promise<UserDto>
  update(id: string, input: UpdateUserRequest): Promise<UserDto>
  remove(id: string): Promise<void>
}
