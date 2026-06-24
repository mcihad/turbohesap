import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Download,
  Plus,
  Users,
  Wallet,
  ShoppingCart,
  Activity,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const Route = createFileRoute('/_authed/genel/dashboard')({
  component: DashboardPage,
})

const STATS: {
  label: string
  value: string
  delta: number
  icon: LucideIcon
}[] = [
  { label: 'Gelir', value: '$48.210', delta: 12.4, icon: Wallet },
  { label: 'Siparişler', value: '1.842', delta: 8.1, icon: ShoppingCart },
  { label: 'Müşteriler', value: '3.219', delta: -2.3, icon: Users },
  { label: 'Şu an aktif', value: '312', delta: 4.7, icon: Activity },
]

const BARS = [42, 55, 48, 67, 73, 61, 88, 79, 94, 71, 83, 96]
const MONTHS = ['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A']

const ACTIVITY = [
  { who: 'Mira Patel', what: '“Northwind” anlaşmasını kapattı', when: '2 dk önce' },
  { who: 'Sistem', what: 'v2.4.0 sürümünü yayınladı', when: '18 dk önce' },
  { who: 'Leo Tan', what: '“Atlas” projesini oluşturdu', when: '1 sa önce' },
  { who: 'Ava Reed', what: '3 üye davet etti', when: '3 sa önce' },
  { who: 'Faturalandırma', what: '42 fatura işledi', when: '5 sa önce' },
]

function DashboardPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Panel"
        description="Tekrar hoş geldiniz — çalışma alanınızda neler olup bittiğine göz atın."
        actions={
          <>
            <Button variant="outline">
              <Download />
              Dışa Aktar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus />
                  Oluştur
                  <ChevronDown className="opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Yeni proje</DropdownMenuItem>
                <DropdownMenuItem>Yeni fatura</DropdownMenuItem>
                <DropdownMenuItem>Üye davet et</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Veri içe aktar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((s) => {
          const up = s.delta >= 0
          return (
            <Card key={s.label}>
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <s.icon className="size-4" />
                  {s.label}
                </CardDescription>
                <CardTitle className="text-3xl">{s.value}</CardTitle>
                <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
                  <Badge variant={up ? 'success' : 'destructive'}>
                    {up ? <ArrowUpRight /> : <ArrowDownRight />}
                    {Math.abs(s.delta)}%
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {/* Chart + activity */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gelir genel bakış</CardTitle>
            <CardDescription>Aylık tekrarlayan gelir, bu yıl</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-56 items-end gap-2">
              {BARS.map((h, i) => (
                <div
                  key={i}
                  className="group flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-primary/80 transition-all group-hover:bg-primary"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <span className="text-2xs text-muted-foreground">
                    {MONTHS[i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son aktiviteler</CardTitle>
            <CardDescription>Kuruluşunuzdaki son olaylar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {a.who[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{a.who}</span>{' '}
                    <span className="text-muted-foreground">{a.what}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{a.when}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className={cn('mt-6 text-center text-xs text-muted-foreground')}>
        İpucu: Komut paletini açmak için{' '}
        <kbd className="rounded border bg-muted px-1.5 font-mono text-2xs">
          ⌘K
        </kbd>{' '}
        tuşlarına basın.
      </p>
    </PageWrapper>
  )
}
