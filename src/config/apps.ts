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
    name: 'Console',
    description: 'Operations dashboard',
    icon: LayoutDashboard,
    color: 'oklch(0.55 0.22 295)',
    to: '/',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Reports & insights',
    icon: BarChart3,
    color: 'oklch(0.55 0.2 255)',
    to: '/analytics',
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Plan & track work',
    icon: FolderKanban,
    color: 'oklch(0.6 0.15 155)',
    to: '/projects',
  },
  {
    id: 'catalog',
    name: 'Catalog',
    description: 'Products & orders',
    icon: Package,
    color: 'oklch(0.72 0.16 65)',
    to: '/catalog/products',
  },
  {
    id: 'crm',
    name: 'Customers',
    description: 'CRM & contacts',
    icon: Users,
    color: 'oklch(0.6 0.21 15)',
    to: '/customers',
  },
  {
    id: 'maps',
    name: 'Live Map',
    description: 'Fleet tracking',
    icon: Map,
    color: 'oklch(0.6 0.13 195)',
    to: '/map',
  },
  {
    id: 'mail',
    name: 'Mail',
    description: 'Team inbox',
    icon: Mail,
    color: 'oklch(0.55 0.2 255)',
    to: '/',
  },
  {
    id: 'chat',
    name: 'Chat',
    description: 'Messages',
    icon: MessageSquare,
    color: 'oklch(0.6 0.15 155)',
    to: '/',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Schedule & events',
    icon: Calendar,
    color: 'oklch(0.6 0.21 15)',
    to: '/',
  },
  {
    id: 'meet',
    name: 'Meet',
    description: 'Video calls',
    icon: Video,
    color: 'oklch(0.55 0.22 295)',
    to: '/',
  },
  {
    id: 'billing',
    name: 'Billing',
    description: 'Plans & invoices',
    icon: CreditCard,
    color: 'oklch(0.72 0.16 65)',
    to: '/finance/billing',
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Workspace config',
    icon: Settings,
    color: 'oklch(0.45 0.01 270)',
    to: '/settings',
  },
]
