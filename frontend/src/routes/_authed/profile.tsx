import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  BadgeCheck,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/auth-context'
import {
  clientRolesOf,
  currentClientId,
  decodeJwt,
  realmRolesOf,
} from '@/lib/auth/tokens'
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

function str(claims: Claims, key: string): string | undefined {
  const v = claims[key]
  return typeof v === 'string' ? v : undefined
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
  const { tokens, refresh } = useAuth()

  if (!tokens) {
    return (
      <PageWrapper>
        <PageHeader title="Profil" description="Oturum bulunamadı." />
      </PageWrapper>
    )
  }

  const idClaims = decodeJwt<Claims>(tokens.idToken) ?? {}
  const name = str(idClaims, 'name') || str(idClaims, 'preferred_username') || 'Kullanıcı'
  const email = str(idClaims, 'email')
  const emailVerified = idClaims.email_verified === true
  const realmRoles = realmRolesOf(tokens)
  const clientRoles = clientRolesOf(tokens)
  const azp = currentClientId(tokens)

  return (
    <PageWrapper>
      <PageHeader
        title="Profil"
        description="Oturum açan kullanıcının kimliği, rolleri ve aktif oturum belirteçleri."
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
            <CardDescription>id_token içindeki kullanıcı bilgileri</CardDescription>
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
                {email ? (
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm text-muted-foreground">
                      {email}
                    </span>
                    {emailVerified ? (
                      <Badge variant="success">
                        <BadgeCheck />
                        Doğrulanmış
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <TriangleAlert />
                        Doğrulanmamış
                      </Badge>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <Separator />

            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Claim label="Kullanıcı adı" value={str(idClaims, 'preferred_username')} />
              <Claim label="Ad" value={str(idClaims, 'given_name')} />
              <Claim label="Soyad" value={str(idClaims, 'family_name')} />
              <Claim label="Kullanıcı kimliği (sub)" value={str(idClaims, 'sub')} mono />
              <Claim label="Oturum (sid)" value={str(idClaims, 'sid')} mono />
              <Claim label="Yayınlayan (iss)" value={str(idClaims, 'iss')} />
            </dl>
          </CardContent>
        </Card>

        {/* Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Roller
            </CardTitle>
            <CardDescription>access_token içindeki realm ve client rolleri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Realm rolleri</p>
              {realmRoles.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {realmRoles.map((r) => (
                    <Badge key={r} variant="secondary">
                      {r}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Realm rolü yok</p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Client rolleri</p>
              {clientRoles.length ? (
                clientRoles.map((c) => (
                  <div key={c.clientId} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{c.clientId}</span>
                      {c.clientId === azp ? (
                        <Badge variant="info">bu modül</Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.roles.map((r) => (
                        <Badge key={r} variant="outline">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Client rolü yok</p>
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
          <Tabs defaultValue="id">
            <TabsList className="w-full">
              <TabsTrigger value="id">ID Token</TabsTrigger>
              <TabsTrigger value="access">Access Token</TabsTrigger>
              <TabsTrigger value="refresh">Refresh Token</TabsTrigger>
            </TabsList>
            <TabsContent value="id">
              <TokenPanel token={tokens.idToken} decode />
            </TabsContent>
            <TabsContent value="access">
              <TokenPanel token={tokens.accessToken} decode />
            </TabsContent>
            <TabsContent value="refresh">
              <TokenPanel token={tokens.refreshToken} decode />
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
