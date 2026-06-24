import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/auth-context'
import { decodeJwt, displayName } from '@/lib/auth/tokens'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Route = createFileRoute('/_authed/profile')({
  component: ProfilePage,
})

type Claims = Record<string, unknown>

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function expiryLabel(claims: Claims | null): string | null {
  const exp = claims?.exp
  if (typeof exp !== 'number') return null
  const when = new Date(exp * 1000).toLocaleString('tr-TR')
  const msLeft = exp * 1000 - Date.now()
  if (msLeft <= 0) return `Süresi doldu • ${when}`
  const mins = Math.floor(msLeft / 60000)
  const secs = Math.floor((msLeft % 60000) / 1000)
  return `${when} • ${mins} dk ${secs} sn kaldı`
}

function ProfilePage() {
  const { user, permissions, tokens, refresh } = useAuth()

  if (!user || !tokens) {
    return (
      <PageWrapper>
        <PageHeader title="Profil" description="Oturum bulunamadı." />
      </PageWrapper>
    )
  }

  const name = displayName(user)

  return (
    <PageWrapper>
      <PageHeader
        title="Profil"
        description="Oturum açan kullanıcının kimliği, rolleri, izinleri ve oturum belirteçleri."
        actions={
          <Button
            variant="outline"
            onClick={async () => {
              const ok = await refresh()
              if (ok) toast.success('Belirteçler yenilendi')
              else toast.error('Belirteçler yenilenemedi')
            }}
          >
            <RefreshCw />
            Belirteçleri yenile
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4" />
              Kimlik
            </CardTitle>
            <CardDescription>Hesap bilgileri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarFallback className="bg-primary/15 text-base font-semibold text-primary">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{name}</p>
                {user.email ? (
                  <span className="truncate text-sm text-muted-foreground">
                    {user.email}
                  </span>
                ) : null}
              </div>
            </div>

            <Separator />

            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Claim label="Kullanıcı adı" value={user.username} />
              <Claim label="E-posta" value={user.email} />
              <Claim label="Ad" value={user.firstName} />
              <Claim label="Soyad" value={user.lastName} />
              <Claim label="Kullanıcı kimliği" value={user.id} mono />
            </dl>
          </CardContent>
        </Card>

        {/* Roles & permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Roller ve izinler
            </CardTitle>
            <CardDescription>access_token içindeki yetkiler</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Roller</p>
              {user.roles.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.map((r) => (
                    <Badge key={r} variant="secondary">
                      {r}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Rol yok</p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">İzinler</p>
              {permissions.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {permissions.map((p) => (
                    <Badge key={p} variant="outline" className="font-mono">
                      {p}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">İzin yok</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tokens */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Oturum belirteçleri
          </CardTitle>
          <CardDescription>
            Belirteçler bu tarayıcıda saklanır. Gizli tutun — paylaşmayın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="access">
            <TabsList className="w-full">
              <TabsTrigger value="access">Access Token</TabsTrigger>
              <TabsTrigger value="refresh">Refresh Token</TabsTrigger>
            </TabsList>
            <TabsContent value="access">
              <TokenPanel token={tokens.accessToken} decode />
            </TabsContent>
            <TabsContent value="refresh">
              <TokenPanel token={tokens.refreshToken} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageWrapper>
  )
}

function Claim({
  label,
  value,
  mono,
}: {
  label: string
  value?: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'break-words text-sm font-medium',
          mono && 'font-mono text-xs',
          (value === undefined || value === null || value === '') &&
            'text-muted-foreground',
        )}
      >
        {value === undefined || value === null || value === '' ? '—' : value}
      </dd>
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          toast.success('Kopyalandı')
          window.setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error('Kopyalanamadı')
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
      Kopyala
    </Button>
  )
}

function TokenPanel({ token, decode }: { token: string; decode?: boolean }) {
  const [shown, setShown] = React.useState(false)
  const claims = decode ? decodeJwt<Claims>(token) : null
  const expiry = expiryLabel(claims)

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShown((s) => !s)}>
          {shown ? <EyeOff /> : <Eye />}
          {shown ? 'Gizle' : 'Göster'}
        </Button>
        <CopyButton value={token} />
        {expiry ? (
          <span className="ml-auto text-xs text-muted-foreground">{expiry}</span>
        ) : null}
      </div>

      <pre
        className={cn(
          'max-h-40 overflow-auto rounded-md border bg-muted/50 p-3 font-mono text-xs',
          shown ? 'break-all whitespace-pre-wrap' : 'truncate',
        )}
      >
        {shown ? token : '•'.repeat(72)}
      </pre>

      {claims ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Çözümlenmiş içerik (imza doğrulanmadı)
          </p>
          <pre className="max-h-72 overflow-auto rounded-md border bg-muted/50 p-3 font-mono text-xs">
            {JSON.stringify(claims, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
