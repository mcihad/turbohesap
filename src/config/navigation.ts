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
      { title: 'Dashboard', icon: LayoutDashboard, to: '/' },
      {
        title: 'Analytics',
        icon: BarChart3,
        to: '/analytics',
        keywords: ['reports', 'metrics', 'insights'],
      },
    ],
  },
  {
    label: 'Workspace',
    items: [
      {
        title: 'Projects',
        icon: FolderKanban,
        children: [
          { title: 'All projects', to: '/projects' },
          { title: 'Active', to: '/projects/active', badge: '12' },
          { title: 'Archived', to: '/projects/archived' },
        ],
      },
      {
        title: 'Catalog',
        icon: Package,
        children: [
          { title: 'Products', icon: Boxes, to: '/catalog/products' },
          { title: 'Orders', icon: ShoppingCart, to: '/catalog/orders', badge: '3' },
          { title: 'Invoices', icon: Receipt, to: '/catalog/invoices' },
        ],
      },
      { title: 'Customers', icon: Users, to: '/customers' },
      { title: 'Documents', icon: FileText, to: '/documents' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Live Map', icon: Map, to: '/map', keywords: ['fleet', 'tracking'] },
      { title: 'Monitoring', icon: Gauge, to: '/monitoring' },
      {
        title: 'Finance',
        icon: Wallet,
        children: [
          { title: 'Billing', icon: CreditCard, to: '/finance/billing' },
          { title: 'Payouts', icon: Wallet, to: '/finance/payouts' },
        ],
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        title: 'Settings',
        icon: Settings,
        children: [
          { title: 'General', to: '/settings' },
          { title: 'Members', to: '/settings/members' },
          { title: 'Organization', icon: Building2, to: '/settings/organization' },
          { title: 'Security', icon: ShieldCheck, to: '/settings/security' },
        ],
      },
      { title: 'Components', icon: Boxes, to: '/components', keywords: ['ui', 'kit'] },
    ],
  },
]

/** Footer (help / feedback) actions shown pinned at the bottom of the sidebar. */
export const SIDEBAR_FOOTER_ITEMS: NavItem[] = [
  { title: 'Help & Docs', icon: LifeBuoy, to: '/help' },
]
