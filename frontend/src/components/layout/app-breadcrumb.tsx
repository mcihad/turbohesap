import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'

import type { NavItem } from '@/config/navigation'
import { useActiveModule } from '@/lib/layout/use-active-module'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/** path -> human title, derived from a module's navigation. */
function buildTitleMap(items: NavItem[], map: Map<string, string>) {
  for (const item of items) {
    if (item.to) map.set(item.to, item.title)
    if (item.children) buildTitleMap(item.children, map)
  }
  return map
}

function humanize(segment: string): string {
  return segment
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

export function AppBreadcrumb() {
  const activeModule = useActiveModule()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const titleMap = React.useMemo(() => {
    const map = new Map<string, string>()
    activeModule.nav.forEach((g) => buildTitleMap(g.items, map))
    return map
  }, [activeModule])

  const crumbs = React.useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    const acc: { path: string; label: string }[] = []
    let current = ''
    segments.forEach((seg, i) => {
      current += `/${seg}`
      if (i === 0) {
        // The module segment links to the module home.
        acc.push({ path: activeModule.home, label: activeModule.label })
      } else {
        acc.push({ path: current, label: titleMap.get(current) ?? humanize(seg) })
      }
    })
    if (acc.length === 0) {
      acc.push({ path: activeModule.home, label: activeModule.label })
    }
    return acc
  }, [pathname, activeModule, titleMap])

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1
          return (
            <React.Fragment key={`${i}-${crumb.path}`}>
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
