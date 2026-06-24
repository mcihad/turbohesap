import { useRouterState } from '@tanstack/react-router'

import { APP_MODULES, moduleForPathname } from '@/modules/registry'
import type { AppModule } from '@/modules/types'

// The module matching the current route (falls back to the first module so the
// shell always has a navigation to render, e.g. on /profile).
export function useActiveModule(): AppModule {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return moduleForPathname(pathname) ?? APP_MODULES[0]
}
