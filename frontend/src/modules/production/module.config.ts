import {
  Boxes,
  CalendarClock,
  ClipboardList,
  Cog,
  Factory,
  Handshake,
  LayoutDashboard,
  ListTree,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

import { ProductionPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

// Üretim (Manufacturing / MRP) — reçete, iş merkezi, üretim/iş emri, fason,
// planlama, kalite ve lot izlenebilirliği. Tüm liste/detay ekranları
// `production.read` ile gizlenir; yazma/aksiyonlar ayrıca kendi izinlerini ister.
export const productionModule: AppModule = {
  key: 'production',
  label: 'Üretim',
  icon: Factory,
  home: '/production',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/production', exact: true },
        {
          title: 'Üretim Emirleri',
          icon: ClipboardList,
          to: '/production/orders',
          keywords: ['üretim emri', 'manufacturing order', 'mo', 'imalat'],
          permission: ProductionPermissions.read,
        },
        {
          title: 'İş Emirleri (Saha)',
          icon: Wrench,
          to: '/production/work-orders',
          keywords: ['iş emri', 'work order', 'saha', 'terminal', 'operasyon'],
          permission: ProductionPermissions.read,
        },
        {
          title: 'Ürün Reçeteleri',
          icon: ListTree,
          to: '/production/boms',
          keywords: ['reçete', 'bom', 'ürün ağacı', 'bill of materials'],
          permission: ProductionPermissions.read,
        },
        {
          title: 'İş Merkezleri',
          icon: Cog,
          to: '/production/work-centers',
          keywords: ['iş merkezi', 'work center', 'istasyon', 'makine'],
          permission: ProductionPermissions.read,
        },
        {
          title: 'Fason',
          icon: Handshake,
          to: '/production/subcontract',
          keywords: ['fason', 'subcontract', 'fasoncu', 'sevk'],
          permission: ProductionPermissions.read,
        },
        {
          title: 'Planlama',
          icon: CalendarClock,
          to: '/production/planning',
          keywords: ['planlama', 'mrp', 'min max', 'reorder', 'öneri'],
          permission: ProductionPermissions.read,
        },
        {
          title: 'Kalite',
          icon: ShieldCheck,
          to: '/production/quality',
          keywords: ['kalite', 'quality', 'kontrol', 'geçti kaldı'],
          permission: ProductionPermissions.read,
        },
        {
          title: 'İzlenebilirlik (Lot)',
          icon: Boxes,
          to: '/production/lots',
          keywords: ['lot', 'parti', 'seri', 'izlenebilirlik', 'recall', 'şecere'],
          permission: ProductionPermissions.read,
        },
      ],
    },
  ],
}
