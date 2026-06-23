import {
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  Map,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

/** A single navigation entry. Either a link (`to`) or a branch (`children`). */
export interface NavItem {
  title: string
  icon?: LucideIcon
  to?: string
  badge?: string
  children?: NavItem[]
  /** Keywords to widen search matching. */
  keywords?: string[]
}

/** Navigation is organized into labeled groups, each holding a tree of items. */
export interface NavGroup {
  label?: string
  items: NavItem[]
}

export const NAVIGATION: NavGroup[] = [
  {
    items: [
      { title: 'Panel', icon: LayoutDashboard, to: '/' },
      {
        title: 'Analiz',
        icon: BarChart3,
        to: '/analytics',
        keywords: ['raporlar', 'metrikler', 'analizler'],
      },
    ],
  },
  {
    label: 'Çalışma Alanı',
    items: [
      {
        title: 'Projeler',
        icon: FolderKanban,
        children: [
          { title: 'Tüm projeler', to: '/projects' },
          { title: 'Aktif', to: '/projects/active', badge: '12' },
          { title: 'Arşivlenenler', to: '/projects/archived' },
        ],
      },
      {
        title: 'Katalog',
        icon: Package,
        children: [
          { title: 'Ürünler', icon: Boxes, to: '/catalog/products' },
          { title: 'Siparişler', icon: ShoppingCart, to: '/catalog/orders', badge: '3' },
          { title: 'Faturalar', icon: Receipt, to: '/catalog/invoices' },
        ],
      },
      { title: 'Müşteriler', icon: Users, to: '/customers' },
      { title: 'Belgeler', icon: FileText, to: '/documents' },
    ],
  },
  {
    label: 'Operasyon',
    items: [
      { title: 'Canlı Harita', icon: Map, to: '/map', keywords: ['filo', 'takip'] },
      { title: 'İzleme', icon: Gauge, to: '/monitoring' },
      {
        title: 'Finans',
        icon: Wallet,
        children: [
          { title: 'Faturalandırma', icon: CreditCard, to: '/finance/billing' },
          { title: 'Ödemeler', icon: Wallet, to: '/finance/payouts' },
        ],
      },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      {
        title: 'Ayarlar',
        icon: Settings,
        children: [
          { title: 'Genel', to: '/settings' },
          { title: 'Üyeler', to: '/settings/members' },
          { title: 'Organizasyon', icon: Building2, to: '/settings/organization' },
          { title: 'Güvenlik', icon: ShieldCheck, to: '/settings/security' },
        ],
      },
      { title: 'Bileşenler', icon: Boxes, to: '/components', keywords: ['ui', 'kit', 'arayüz'] },
    ],
  },
]

/** Footer (help / feedback) actions shown pinned at the bottom of the sidebar. */
export const SIDEBAR_FOOTER_ITEMS: NavItem[] = [
  { title: 'Yardım ve Dokümanlar', icon: LifeBuoy, to: '/help' },
]

