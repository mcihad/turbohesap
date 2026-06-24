import { Blocks } from 'lucide-react'

import { ComponentsPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'
import { showcasesByCategory } from './showcases'

// Bileşenler — a frontend-only gallery of the UI components we build/use. No
// backend, no permissions (open to all signed-in users, like `genel`). The
// sidebar nav is generated from the showcase registry, grouped by category; each
// item opens /components/<slug>.
export const componentsModule: AppModule = {
  key: 'components',
  label: 'Bileşenler',
  icon: Blocks,
  home: '/components',
  nav: showcasesByCategory().map(({ category, icon, items }) => ({
    label: category,
    icon,
    items: items.map((s) => ({
      title: s.title,
      to: `/components/${s.slug}`,
      permission: ComponentsPermissions.read,
    })),
  })),
}
