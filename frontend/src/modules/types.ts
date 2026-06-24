import type { LucideIcon } from 'lucide-react'

import type { NavGroup } from '@/config/navigation'

// An application module: a section reachable from the left module rail. Each one
// owns its navigation (the sidebar tree) and a home route. The whole UI is
// composed from these — switching modules swaps the sidebar + content, the shell
// stays the same.
export interface AppModule {
  /** Stable key, also the first path segment: /<key>/... and /api/<key>/... */
  key: string
  /** Turkish label shown in the rail tooltip + sidebar header. */
  label: string
  /** lucide icon shown in the module rail. */
  icon: LucideIcon
  /** Route to open when the module is selected. */
  home: string
  /** Sidebar navigation for this module. */
  nav: NavGroup[]
}
