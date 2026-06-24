import {
  CreditCard,
  LogOut,
  Settings,
  User,
  Users,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { useAuth } from '@/lib/auth/auth-context'
import { displayName } from '@/lib/auth/tokens'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function UserMenu() {
  const { user, logout } = useAuth()
  const name = user ? displayName(user) : 'Kullanıcı'
  const email = user?.email ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Hesap menüsü"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/15 font-semibold text-primary">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{name}</span>
            {email ? (
              <span className="text-xs text-muted-foreground">{email}</span>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/profile">
              <User />
              Profil
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={'/finance/billing' as string}>
              <CreditCard />
              Faturalandırma
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings />
              Ayarlar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={'/settings/members' as string}>
              <Users />
              Ekip
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
          <LogOut />
          Çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
