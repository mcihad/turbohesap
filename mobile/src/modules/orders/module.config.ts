import { OrdersPermissions } from '@turbohesap/shared'
import type { MobileModule } from '../types'

// Sipariş yönetimi — the Teklif → Sipariş → İrsaliye → Fatura chain. Each list
// item drills into a kind-filtered OrdersListScreen (registered under its own
// screen key, since the module home navigates by item key without params).
export const ordersModule: MobileModule = {
  key: 'orders',
  label: 'Siparişler',
  icon: 'clipboard',
  home: 'orders.home',
  permission: OrdersPermissions.read,
  items: [
    {
      key: 'orders.quotes',
      title: 'Teklifler',
      icon: 'file-text',
      description: 'Satış ve alış teklifleri',
      permission: OrdersPermissions.read,
    },
    {
      key: 'orders.orders',
      title: 'Siparişler',
      icon: 'clipboard',
      description: 'Onaylanmış siparişler',
      permission: OrdersPermissions.read,
    },
    {
      key: 'orders.deliveries',
      title: 'İrsaliyeler',
      icon: 'truck',
      description: 'Sevk irsaliyeleri',
      permission: OrdersPermissions.read,
    },
  ],
}
