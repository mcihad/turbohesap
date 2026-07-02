import type {
  FinishWorkOrderRequest,
  StartWorkOrderRequest,
  WorkOrderDto,
  WorkOrderListQuery,
} from './work-order.dto'

// İş Emri servisi — saha terminali akışı. start/pause/resume/finish iş emrini
// ilerletir ve zaman logu tutar; bağlı Üretim Emrinin durumunu (in_progress)
// otomatik günceller.
export interface IWorkOrdersService {
  list(query?: WorkOrderListQuery): Promise<WorkOrderDto[]>
  get(id: string): Promise<WorkOrderDto>
  start(id: string, input?: StartWorkOrderRequest): Promise<WorkOrderDto>
  pause(id: string): Promise<WorkOrderDto>
  resume(id: string, input?: StartWorkOrderRequest): Promise<WorkOrderDto>
  finish(id: string, input: FinishWorkOrderRequest): Promise<WorkOrderDto>
}
