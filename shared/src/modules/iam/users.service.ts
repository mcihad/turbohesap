import type {
  CreateUserRequest,
  ResetPasswordRequest,
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
  /** Admin reset of another user's password (revokes their active sessions). */
  resetPassword(id: string, input: ResetPasswordRequest): Promise<void>
}
