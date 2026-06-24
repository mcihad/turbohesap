import * as React from 'react'
import { FileClock } from 'lucide-react'

import { IamPermissions } from '@turbohesap/shared'

import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { EntityAuditTrail } from './entity-audit-trail'

/**
 * EntityAuditButton — the standard "Denetim Kayıtları" action for entity detail
 * pages. Renders nothing unless the user has `iam.audit.read`. Clicking opens a
 * right drawer with the entity's audit timeline. Wired automatically by
 * `PageHeader`'s `audit` prop, or droppable into a page's `actions`.
 */
export function EntityAuditButton({
  entityType,
  entityId,
  title = 'Denetim Kayıtları',
}: {
  entityType: string
  entityId: string
  title?: string
}) {
  const { hasPermission } = useAuth()
  const [open, setOpen] = React.useState(false)

  if (!hasPermission(IamPermissions.auditRead)) return null

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileClock />
        <span className="hidden sm:inline">Denetim Kayıtları</span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <FileClock className="size-4" />
              {title}
            </SheetTitle>
            <SheetDescription className="font-mono text-xs break-all">
              {entityType} · #{entityId}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
            {open ? (
              <EntityAuditTrail entityType={entityType} entityId={entityId} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
