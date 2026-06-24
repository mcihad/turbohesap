import { Link } from '@tanstack/react-router'

import { ComponentsPermissions } from '@turbohesap/shared'

import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { showcasesByCategory } from '../showcases'

// Landing page (/components): a categorized grid of every component showcase.
export function ComponentsIndexPage() {
  return (
    <PermissionRequired permission={ComponentsPermissions.read}>
    <PageWrapper>
      <PageHeader
        title="Bileşenler"
        description="Sistemde geliştirdiğimiz ve kullandığımız arayüz bileşenlerinin önizlemeleri."
      />
      <div className="space-y-8">
        {showcasesByCategory().map(({ category, items }) => (
          <section key={category} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {category}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <Link
                  key={s.slug}
                  to="/components/$slug"
                  params={{ slug: s.slug }}
                  className="block"
                >
                  <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
                    <CardHeader>
                      <CardTitle className="text-base">{s.title}</CardTitle>
                      <CardDescription>{s.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageWrapper>
    </PermissionRequired>
  )
}
