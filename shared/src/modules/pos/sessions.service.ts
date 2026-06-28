import type {
  CloseSessionRequest,
  OpenSessionRequest,
  PosSessionDto,
  SessionListQuery,
} from './session.dto'

export interface IPosSessionsService {
  list(query?: SessionListQuery): Promise<PosSessionDto[]>
  get(id: string): Promise<PosSessionDto>
  /** Currently open session on a register, or null. */
  current(registerId: string): Promise<PosSessionDto | null>
  open(input: OpenSessionRequest): Promise<PosSessionDto>
  close(id: string, input: CloseSessionRequest): Promise<PosSessionDto>
}
