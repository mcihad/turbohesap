import type {
  BranchDto,
  CreateBranchRequest,
  UpdateBranchRequest,
} from './branch.dto'

// Contract for the branches resource (/api/org/branches).
export interface IBranchesService {
  list(): Promise<BranchDto[]>
  get(id: string): Promise<BranchDto>
  create(input: CreateBranchRequest): Promise<BranchDto>
  update(id: string, input: UpdateBranchRequest): Promise<BranchDto>
  remove(id: string): Promise<void>
}
