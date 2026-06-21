import {
  BarChart3,
  Calendar,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Map,
  Package,
  Settings,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'

/** An application tile shown in the app launcher (Office / Unity style). */
export interface AppEntry {
  id: string
  name: string
  description: string
  icon: LucideIcon
  /** OKLCH/hex color used for the tile's icon chip. */
  color: string
  to: string
}

export const APPS: AppEntry[] = [
  {
    id: 'console',
    name: 'Konsol',
    description: 'Operasyon paneli',
    icon: LayoutDashboard,
    color: 'oklch(0.55 0.22 295)',
    to: '/',
  },
  {
    id: 'analytics',
    name: 'Analiz',
    description: 'Raporlar ve içgörüler',
    icon: BarChart3,
    color: 'oklch(0.55 0.2 255)',
    to: '/analytics',
  },
  {
    id: 'projects',
    name: 'Projeler',
    description: 'İş planlama ve takip',
    icon: FolderKanban,
    color: 'oklch(0.6 0.15 155)',
    to: '/projects',
  },
  {
    id: 'catalog',
    name: 'Katalog',
    description: 'Ürünler ve siparişler',
    icon: Package,
    color: 'oklch(0.72 0.16 65)',
    to: '/catalog/products',
  },
  {
    id: 'crm',
    name: 'Müşteriler',
    description: 'CRM ve kişiler',
    icon: Users,
    color: 'oklch(0.6 0.21 15)',
    to: '/customers',
  },
  {
    id: 'maps',
    name: 'Canlı Harita',
    description: 'Filo takibi',
    icon: Map,
    color: 'oklch(0.6 0.13 195)',
    to: '/map',
  },
  {
    id: 'mail',
    name: 'E-posta',
    description: 'Ekip gelen kutusu',
    icon: Mail,
    color: 'oklch(0.55 0.2 255)',
    to: '/',
  },
  {
    id: 'chat',
    name: 'Sohbet',
    description: 'Mesajlar',
    icon: MessageSquare,
    color: 'oklch(0.6 0.15 155)',
    to: '/',
  },
  {
    id: 'calendar',
    name: 'Takvim',
    description: 'Program ve etkinlikler',
    icon: Calendar,
    color: 'oklch(0.6 0.21 15)',
    to: '/',
  },
  {
    id: 'meet',
    name: 'Toplantı',
    description: 'Görüntülü görüşmeler',
    icon: Video,
    color: 'oklch(0.55 0.22 295)',
    to: '/',
  },
  {
    id: 'billing',
    name: 'Faturalandırma',
    description: 'Planlar ve faturalar',
    icon: CreditCard,
    color: 'oklch(0.72 0.16 65)',
    to: '/finance/billing',
  },
  {
    id: 'settings',
    name: 'Ayarlar',
    description: 'Çalışma alanı yapılandırması',
    icon: Settings,
    color: 'oklch(0.45 0.01 270)',
    to: '/settings',
  },
]
