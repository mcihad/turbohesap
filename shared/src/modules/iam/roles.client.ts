import type { AxiosInstance } from 'axios'

import type {
  CreateRoleRequest,
  RoleDto,
  UpdateRoleRequest,
} from './role.dto'
import type { IRolesService } from './roles.service'

// axios-backed implementation of IRolesService → /api/iam/roles.
export class RolesApiClient implements IRolesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<RoleDto[]> {
    const { data } = await this.http.get<RoleDto[]>('/iam/roles')
    return data
  }

  async get(id: string): Promise<RoleDto> {
    const { data } = await this.http.get<RoleDto>(`/iam/roles/${id}`)
    return data
  }

  async create(input: CreateRoleRequest): Promise<RoleDto> {
    const { data } = await this.http.post<RoleDto>('/iam/roles', input)
    return data
  }

  async update(id: string, input: UpdateRoleRequest): Promise<RoleDto> {
    const { data } = await this.http.patch<RoleDto>(`/iam/roles/${id}`, input)
    return data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/iam/roles/${id}`)
  }
}
