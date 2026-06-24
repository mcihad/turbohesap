import type { AxiosInstance } from 'axios'

import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserDto,
} from './user.dto'
import type { IUsersService } from './users.service'

// axios-backed implementation of IUsersService → /api/iam/users.
export class UsersApiClient implements IUsersService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<UserDto[]> {
    const { data } = await this.http.get<UserDto[]>('/iam/users')
    return data
  }

  async get(id: string): Promise<UserDto> {
    const { data } = await this.http.get<UserDto>(`/iam/users/${id}`)
    return data
  }

  async create(input: CreateUserRequest): Promise<UserDto> {
    const { data } = await this.http.post<UserDto>('/iam/users', input)
    return data
  }

  async update(id: string, input: UpdateUserRequest): Promise<UserDto> {
    const { data } = await this.http.patch<UserDto>(`/iam/users/${id}`, input)
    return data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/iam/users/${id}`)
  }
}
