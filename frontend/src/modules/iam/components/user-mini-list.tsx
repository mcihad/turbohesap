import { Link } from '@tanstack/react-router'

import type { UserDto } from '@turbohesap/shared'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

function initials(u: UserDto): string {
  const n = `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.trim()
  return (n || u.username.slice(0, 2)).toUpperCase()
}

function fullName(u: UserDto): string {
  return `${u.firstName} ${u.lastName}`.trim() || u.username
}

/** Compact, linkable list of users — used on role / permission detail pages. */
export function UserMiniList({
  users,
  loading = false,
  emptyText = 'Kullanıcı yok.',
}: {
  users: UserDto[]
  loading?: boolean
  emptyText?: string
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {users.map((u) => (
        <li key={u.id}>
          <Link
            to="/iam/users/$id"
            params={{ id: u.id }}
            className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {initials(u)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{fullName(u)}</p>
              <p className="truncate text-xs text-muted-foreground">
                @{u.username} · {u.email}
              </p>
            </div>
            {!u.isActive ? <Badge variant="outline">Pasif</Badge> : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}
