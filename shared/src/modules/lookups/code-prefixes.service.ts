import type {
  CodePrefixDto,
  ConsumeCodeResponse,
  CreateCodePrefixRequest,
  PeekCodeResponse,
  UpdateCodePrefixRequest,
} from './code-prefix.dto'

// Contract for the code-prefixes resource (/api/lookups/code-prefixes).
export interface ICodePrefixesService {
  /** Prefixes, optionally filtered to a single usage context. */
  list(context?: string): Promise<CodePrefixDto[]>
  get(id: string): Promise<CodePrefixDto>
  create(input: CreateCodePrefixRequest): Promise<CodePrefixDto>
  update(id: string, input: UpdateCodePrefixRequest): Promise<CodePrefixDto>
  remove(id: string): Promise<void>
  /** Non-mutating preview of the next code — safe to call repeatedly. */
  peek(id: string): Promise<PeekCodeResponse>
  /** Atomically issues the next code and advances the counter. */
  consume(id: string): Promise<ConsumeCodeResponse>
}
