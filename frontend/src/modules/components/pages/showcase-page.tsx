import { useParams } from '@tanstack/react-router'

import { ComponentsPermissions } from '@turbohesap/shared'

import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { getShowcase } from '../showcases'

// Renders a single component's showcase (the /components/<slug> page).
export function ShowcasePage() {
  const { slug } = useParams({ from: '/_authed/components/$slug' })
  const sc = getShowcase(slug)
  const Demo = sc?.Demo

  return (
    <PermissionRequired permission={ComponentsPermissions.read}>
      {sc && Demo ? (
        <PageWrapper>
          <PageHeader title={sc.title} description={sc.description} />
          <Demo />
        </PageWrapper>
      ) : (
        <PageWrapper>
          <PageHeader title="Bulunamadı" description="Böyle bir bileşen yok." />
        </PageWrapper>
      )}
    </PermissionRequired>
  )
}
