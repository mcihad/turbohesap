import type {
  CreateLookupItemRequest,
  LookupItemDto,
  LookupListInfo,
  UpdateLookupItemRequest,
} from './lookup.dto'

// Contract for the lookups resource (/api/lookups). One service for both the
// items and the list overview.
export interface ILookupsService {
  /** Items, optionally filtered to a single list (sorted by sortOrder, value). */
  list(list?: string): Promise<LookupItemDto[]>
  /** Distinct lists with their item counts (for the management overview). */
  lists(): Promise<LookupListInfo[]>
  get(id: string): Promise<LookupItemDto>
  create(input: CreateLookupItemRequest): Promise<LookupItemDto>
  update(id: string, input: UpdateLookupItemRequest): Promise<LookupItemDto>
  remove(id: string): Promise<void>
}
