import * as React from 'react'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { Calculator, LogIn } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FullPageLoader } from '@/components/full-page-loader'
import { useAuth } from '@/lib/auth/auth-context'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  if (status === 'loading') return <FullPageLoader />
  if (status === 'authenticated') return <Navigate to="/genel/dashboard" replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) return
    setSubmitting(true)
    try {
      await login(username, password)
      void navigate({ to: '/genel/dashboard', replace: true })
    } catch {
      toast.error('Giriş başarısız', {
        description: 'Kullanıcı adı veya parola hatalı.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-2">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary-foreground/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-primary-foreground/10 blur-3xl"
        />

        <div className="relative flex items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <Calculator className="size-5" />
          </span>
          TurboHesap
        </div>

        <div className="relative space-y-3">
          <h1 className="text-3xl font-semibold leading-tight">
            İşletmenizin tüm hesapları, tek yerde.
          </h1>
          <p className="max-w-sm text-sm text-primary-foreground/80">
            Kullanıcılar, roller ve modüller — hepsi tek ve tutarlı bir arayüzde.
          </p>
        </div>

        <p className="relative text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} TurboHesap
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-svh items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-sm">
          {/* Brand mark — mobile only */}
          <div className="mb-8 flex items-center gap-2 font-semibold lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calculator className="size-5" />
            </span>
            TurboHesap
          </div>

          <div className="mb-8 space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Giriş yap</h2>
            <p className="text-sm text-muted-foreground">
              Devam etmek için hesabınızla giriş yapın.
            </p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı adı</Label>
              <Input
                id="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parola</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={submitting}
            >
              <LogIn />
              {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
