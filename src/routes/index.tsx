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

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

const STATS: {
  label: string
  value: string
  delta: number
  icon: LucideIcon
}[] = [
  { label: 'Revenue', value: '$48,210', delta: 12.4, icon: Wallet },
  { label: 'Orders', value: '1,842', delta: 8.1, icon: ShoppingCart },
  { label: 'Customers', value: '3,219', delta: -2.3, icon: Users },
  { label: 'Active now', value: '312', delta: 4.7, icon: Activity },
]

const BARS = [42, 55, 48, 67, 73, 61, 88, 79, 94, 71, 83, 96]
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

const ACTIVITY = [
  { who: 'Mira Patel', what: 'closed deal “Northwind”', when: '2m ago' },
  { who: 'System', what: 'deployed release v2.4.0', when: '18m ago' },
  { who: 'Leo Tan', what: 'created project “Atlas”', when: '1h ago' },
  { who: 'Ava Reed', what: 'invited 3 members', when: '3h ago' },
  { who: 'Billing', what: 'processed 42 invoices', when: '5h ago' },
]

function DashboardPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Dashboard"
        description="Welcome back — here's what's happening across your workspace."
        actions={
          <>
            <Button variant="outline">
              <Download />
              Export
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus />
                  Create
                  <ChevronDown className="opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>New project</DropdownMenuItem>
                <DropdownMenuItem>New invoice</DropdownMenuItem>
                <DropdownMenuItem>Invite member</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Import data</DropdownMenuItem>
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
            <CardTitle>Revenue overview</CardTitle>
            <CardDescription>Monthly recurring revenue, this year</CardDescription>
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
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest events in your org</CardDescription>
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
        Tip: press{' '}
        <kbd className="rounded border bg-muted px-1.5 font-mono text-2xs">
          ⌘K
        </kbd>{' '}
        to open the command palette.
      </p>
    </PageWrapper>
  )
}
