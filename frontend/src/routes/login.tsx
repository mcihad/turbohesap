import * as React from 'react'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { LogIn } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FullPageLoader } from '@/components/full-page-loader'
import { useAuth } from '@/lib/auth/auth-context'
import { ModeToggle } from '@/components/layout/mode-toggle'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [currentSlide, setCurrentSlide] = React.useState(0)

  const slides = [
    {
      title: 'Hızlı ve Güvenilir POS Terminali',
      desc: 'Kasa satışları, masa siparişleri ve anlık stok takibini saniyeler içinde kolayca gerçekleştirin.',
      tag: 'Satış Noktası',
    },
    {
      title: 'Gelişmiş Finans & Kasa Yönetimi',
      desc: 'Banka hesaplarınızı, nakit kasalarınızı ve cari borç/alacak bakiyelerinizi tek ekrandan yönetin.',
      tag: 'Finans',
    },
    {
      title: 'Akıllı Envanter & Stok Takibi',
      desc: 'Ürünlerinizi kategoriler ve dinamik niteliklerle tanımlayın; kritik stok uyarılarıyla kontrolü kaybetmeyin.',
      tag: 'Envanter',
    },
    {
      title: 'Gelişmiş Rol ve İzin Yönetimi',
      desc: 'Çalışanlarınıza rol bazlı hassas izin sınırları atayarak işletme verilerinizi güvenle koruyun.',
      tag: 'Yönetim',
    },
  ]

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

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
    <div className="relative min-h-svh lg:grid lg:grid-cols-[3fr_2fr] bg-background">
      <div className="absolute right-4 top-4 z-50">
        <ModeToggle />
      </div>
      {/* Brand panel — desktop only */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary dark:bg-zinc-950 p-12 text-white lg:flex border-r border-border/5">
        {/* Dark overlay to enrich the theme colors and ensure text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15 dark:from-black/10 dark:to-black/20 pointer-events-none" />

        {/* Clean, minimalist theme-colored glow elements */}
        <div className="absolute -right-32 -top-32 size-[450px] rounded-full bg-primary/8 dark:bg-primary/12 blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 size-[350px] rounded-full bg-primary/4 dark:bg-primary/6 blur-[90px] pointer-events-none" />

        {/* Brand identity (Flat logo rendering) */}
        <div className="relative flex items-center gap-3.5 font-bold text-2xl tracking-tight text-white">
          <img src="/logo.png" alt="TurboHesap Logo" className="h-11 w-auto object-contain rounded-lg" />
          <span>TurboHesap</span>
        </div>

        {/* Borderless Info Carousel */}
        <div className="relative space-y-4 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-white/90 tracking-wide uppercase">
            {slides[currentSlide].tag}
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white min-h-[96px] select-none">
            {slides[currentSlide].title}
          </h1>
          <p className="text-base text-white/70 leading-relaxed min-h-[72px] select-none">
            {slides[currentSlide].desc}
          </p>

          {/* Slide Indicator Dots */}
          <div className="flex gap-2 pt-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
                }`}
                aria-label={`Slayt ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between text-xs text-white/50">
          <p>© {new Date().getFullYear()} TurboHesap</p>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500/80 animate-pulse" />
            <span>Sistem Aktif</span>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-svh items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-[320px] space-y-8">
          {/* Mobile-integrated Header (Logo on left, Heading on right) */}
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-zinc-950 border border-white/5 shadow-sm shrink-0 lg:hidden">
              <img
                src="/logo.png"
                alt="TurboHesap Logo"
                className="size-9 object-contain"
              />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Giriş Yap</h2>
              <p className="text-sm text-muted-foreground">
                Devam etmek için hesabınızla giriş yapın.
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input
                id="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="kullanıcı adınız"
                className="h-11"
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
                placeholder="••••••••"
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-sm transition-all duration-200 active:scale-[0.98]"
              size="lg"
              disabled={submitting}
            >
              <LogIn className="size-5 mr-1" />
              {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
