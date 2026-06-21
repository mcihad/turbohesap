import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'

import { NAVIGATION, type NavItem } from '@/config/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/** path -> human title, derived from the navigation config. */
function buildTitleMap(items: NavItem[], map: Map<string, string>) {
  for (const item of items) {
    if (item.to) map.set(item.to, item.title)
    if (item.children) buildTitleMap(item.children, map)
  }
  return map
}

const TITLE_MAP = (() => {
  const map = new Map<string, string>()
  NAVIGATION.forEach((g) => buildTitleMap(g.items, map))
  return map
})()

function titleFor(path: string, segment: string): string {
  return (
    TITLE_MAP.get(path) ??
    segment
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ')
  )
}

export function AppBreadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const crumbs = React.useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    const acc: { path: string; label: string }[] = [
      { path: '/', label: TITLE_MAP.get('/') ?? 'Ana Sayfa' },
    ]
    let current = ''
    for (const seg of segments) {
      current += `/${seg}`
      acc.push({ path: current, label: titleFor(current, seg) })
    }
    return acc
  }, [pathname])

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1
          return (
            <React.Fragment key={crumb.path}>
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
