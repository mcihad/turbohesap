import { OrdersPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

export const ORDERS_PERMISSION_DEFS: PermissionDef[] = [
  { key: OrdersPermissions.read, description: 'Sipariş belgelerini görüntüleme (Teklif/Sipariş/İrsaliye)', group: 'orders' },
  { key: OrdersPermissions.write, description: 'Sipariş belgesi oluşturma ve düzenleme', group: 'orders' },
  { key: OrdersPermissions.confirm, description: 'Sipariş belgesini onaylama / sevk etme (numara verir, stok hareketi)', group: 'orders' },
  { key: OrdersPermissions.convert, description: 'Sipariş belgesini bir sonraki adıma dönüştürme (sipariş/irsaliye/fatura)', group: 'orders' },
  { key: OrdersPermissions.cancel, description: 'Sipariş belgesini iptal etme', group: 'orders' },
]
