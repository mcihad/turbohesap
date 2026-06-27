import type { AxiosInstance } from 'axios'

import type {
  BranchDto,
  CreateBranchRequest,
  UpdateBranchRequest,
} from './branch.dto'
import type { IBranchesService } from './branches.service'

// Axios implementation of IBranchesService → /api/org/branches.
export class BranchesApiClient implements IBranchesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<BranchDto[]> {
    return (await this.http.get<BranchDto[]>('/org/branches')).data
  }

  async get(id: string): Promise<BranchDto> {
    return (await this.http.get<BranchDto>(`/org/branches/${id}`)).data
  }

  async create(input: CreateBranchRequest): Promise<BranchDto> {
    return (await this.http.post<BranchDto>('/org/branches', input)).data
  }

  async update(id: string, input: UpdateBranchRequest): Promise<BranchDto> {
    return (await this.http.patch<BranchDto>(`/org/branches/${id}`, input)).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/org/branches/${id}`)
  }
}
