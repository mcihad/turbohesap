import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { Construction } from 'lucide-react'

import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/$')({
  component: PlaceholderPage,
})

/**
 * Catch-all placeholder so every navigation entry resolves to a real page in
 * this template. Replace by adding a matching file under src/routes.
 */
function PlaceholderPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const title = pathname
    .split('/')
    .filter(Boolean)
    .pop()
    ?.split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')

  return (
    <PageWrapper>
      <PageHeader title={title ?? 'Page'} description={pathname} />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Construction className="size-6" />
          </span>
          <div>
            <p className="font-medium">This page is a placeholder</p>
            <p className="text-sm text-muted-foreground">
              Add{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                src/routes{pathname}.tsx
              </code>{' '}
              to build it out.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
