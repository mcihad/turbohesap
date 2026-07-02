import type {
  CompleteManufacturingOrderRequest,
  CreateFromDemandRequest,
  CreateManufacturingOrderRequest,
  ManufacturingOrderDto,
  ManufacturingOrderListQuery,
  UpdateManufacturingOrderRequest,
} from './manufacturing-order.dto'

// Üretim Emri servisi. confirm = reçete patlat + snapshot + rezerve + iş emirleri;
// complete = sarf + mamul giriş + maliyet rollup + rezervasyon kapat; cancel =
// stok hareketlerini geri al + rezervasyonu serbest bırak.
export interface IManufacturingOrdersService {
  list(query?: ManufacturingOrderListQuery): Promise<ManufacturingOrderDto[]>
  get(id: string): Promise<ManufacturingOrderDto>
  create(input: CreateManufacturingOrderRequest): Promise<ManufacturingOrderDto>
  /** Make-to-order: create an MO (sourceMode=mto) from a sales demand line. */
  createFromDemand(input: CreateFromDemandRequest): Promise<ManufacturingOrderDto>
  update(id: string, input: UpdateManufacturingOrderRequest): Promise<ManufacturingOrderDto>
  remove(id: string): Promise<void>
  confirm(id: string): Promise<ManufacturingOrderDto>
  complete(id: string, input: CompleteManufacturingOrderRequest): Promise<ManufacturingOrderDto>
  cancel(id: string): Promise<ManufacturingOrderDto>
}
