import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, CreditCard, UserSquare, Check } from 'lucide-react'
import { toast } from 'sonner'

import {
  toApiError,
  type AddPosPaymentRequest,
  type PosOrderDto,
  type PosPaymentMethod,
} from '@turbohesap/shared'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { money, PAYMENT_METHOD_LABELS } from '../labels'

type SplitMode = 'full' | 'items' | 'equal' | 'custom'

// Tahsilat ekranı — the heart of checkout. Works on an already-created (open)
// order: each tender is POSTed and the server recomputes paid/remaining/change,
// auto-settling (stock+kasa+cari) when fully paid. Supports split modes
// (hepsi / eşit N'e / tutara göre) and mixed tenders (nakit + kart + cari).
export function TenderDialog({
  order,
  onClose,
  onPaid,
}: {
  order: PosOrderDto | null
  onClose: () => void
  onPaid: () => void
}) {
  const open = !!order
  const qc = useQueryClient()
  const currency = order?.currencyCode ?? 'TRY'

  const cashQuery = useQuery({ queryKey: ['finance', 'cash-accounts'], queryFn: () => api.finance.cashAccounts.list(), enabled: open })
  const bankQuery = useQuery({ queryKey: ['finance', 'bank-accounts'], queryFn: () => api.finance.bankAccounts.list(), enabled: open })
  const contactsQuery = useQuery({ queryKey: ['contacts', 'all'], queryFn: () => api.contacts.contacts.list(), enabled: open })

  const [method, setMethod] = React.useState<PosPaymentMethod>('cash')
  const [splitMode, setSplitMode] = React.useState<SplitMode>('full')
  const [splitN, setSplitN] = React.useState(2)
  // 'items' mode: charge a person for the cart lines they picked.
  const [pickedLines, setPickedLines] = React.useState<Set<string>>(new Set())
  const [amount, setAmount] = React.useState('')
  const [tendered, setTendered] = React.useState('')
  const [cashAccountId, setCashAccountId] = React.useState<string>('')
  const [bankAccountId, setBankAccountId] = React.useState<string>('')
  const [contactId, setContactId] = React.useState<string>('')

  // Live order (refetched after each payment) so paid/remaining/change update.
  const [live, setLive] = React.useState<PosOrderDto | null>(order)
  React.useEffect(() => setLive(order), [order])

  const remaining = live ? Math.max(0, round2(live.grandTotal - live.paidTotal)) : 0
  const isPaid = !!live && live.status !== 'open'
  // Sum of the cart lines this person picked (for the 'items' split mode).
  const itemsTotal = React.useMemo(() => {
    if (!live) return 0
    return round2(
      live.lines.filter((l) => pickedLines.has(l.id)).reduce((s, l) => s + l.lineTotal, 0),
    )
  }, [live, pickedLines])

  // Default the amount to the split target whenever mode/remaining changes.
  React.useEffect(() => {
    if (!open) return
    if (splitMode === 'full') setAmount(remaining.toFixed(2))
    else if (splitMode === 'equal') setAmount(round2(remaining / Math.max(1, splitN)).toFixed(2))
    else if (splitMode === 'items') setAmount(Math.min(itemsTotal, remaining).toFixed(2))
    // custom: leave as the cashier typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitMode, splitN, remaining, open, itemsTotal])

  // Default account selections once loaded.
  React.useEffect(() => {
    if (cashQuery.data?.length && !cashAccountId) setCashAccountId(cashQuery.data[0].id)
    if (bankQuery.data?.length && !bankAccountId) setBankAccountId(bankQuery.data[0].id)
    if (order?.contactId) setContactId(order.contactId)
  }, [cashQuery.data, bankQuery.data, order?.contactId, cashAccountId, bankAccountId])

  const pay = useMutation({
    mutationFn: async () => {
      if (!live) throw new Error('no order')
      const amt = Number(amount)
      if (!amt || amt <= 0) throw new Error('Tutar girin')
      const body: AddPosPaymentRequest = {
        method,
        amount: amt,
        cashAccountId: method === 'cash' ? cashAccountId : undefined,
        bankAccountId: method === 'card' ? bankAccountId : undefined,
        contactId: method === 'account' ? contactId || undefined : undefined,
        tendered: method === 'cash' && tendered ? Number(tendered) : undefined,
      }
      return api.pos.orders.addPayment(live.id, body)
    },
    onSuccess: (updated) => {
      setLive(updated)
      setTendered('')
      qc.invalidateQueries({ queryKey: ['finance'] })
      if (updated.status !== 'open') {
        const change = updated.changeDue
        toast.success('Ödeme tamamlandı', {
          description: change > 0 ? `Para üstü: ${money(change, currency)}` : undefined,
        })
      }
    },
    onError: (e) => toast.error('Tahsilat başarısız', { description: toApiError(e).message }),
  })

  const methods: { key: PosPaymentMethod; icon: typeof Banknote }[] = [
    { key: 'cash', icon: Banknote },
    { key: 'card', icon: CreditCard },
    { key: 'account', icon: UserSquare },
  ]
  const splitModes: { key: SplitMode; label: string }[] = [
    { key: 'full', label: 'Hepsi' },
    { key: 'items', label: 'Ürün seç' },
    { key: 'equal', label: "Eşit N'e" },
    { key: 'custom', label: 'Tutara göre' },
  ]

  const change =
    method === 'cash' && tendered ? Math.max(0, round2(Number(tendered) - Number(amount || 0))) : 0

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Tahsilat — {live?.orderNo}</DialogTitle>
          <DialogDescription>
            Toplam {money(live?.grandTotal, currency)} · Kalan {money(remaining, currency)}
          </DialogDescription>
        </DialogHeader>

        {isPaid ? (
          <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="size-7" />
            </div>
            <p className="text-lg font-semibold">Ödeme tamamlandı</p>
            {live!.changeDue > 0 ? (
              <p className="text-sm text-muted-foreground">Para üstü: {money(live!.changeDue, currency)}</p>
            ) : null}
            <Button
              className="mt-2 w-full"
              onClick={() => {
                onPaid()
              }}
            >
              Tamam · Yeni Satış
            </Button>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-4">
            {/* paid-so-far breakdown */}
            {live && live.payments.length > 0 ? (
              <div className="space-y-1 rounded-md bg-muted/40 p-2 text-2xs">
                {live.payments.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</span>
                    <span className="tabular-nums">{money(p.amount, currency)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* split mode */}
            <div className="flex gap-1.5">
              {splitModes.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSplitMode(s.key)}
                  className={cn(
                    'flex-1 rounded-md border px-2 py-2 text-xs font-medium',
                    splitMode === s.key ? 'border-primary bg-primary/10 text-primary' : 'bg-background hover:bg-accent',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {splitMode === 'items' ? (
              <div className="space-y-1.5 rounded-md border p-2">
                <p className="text-2xs text-muted-foreground">
                  Bu kişinin ödeyeceği ürünleri seçin
                </p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {live?.lines.map((l) => {
                    const on = pickedLines.has(l.id)
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() =>
                          setPickedLines((cur) => {
                            const next = new Set(cur)
                            if (next.has(l.id)) next.delete(l.id)
                            else next.add(l.id)
                            return next
                          })
                        }
                        className={cn(
                          'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm',
                          on ? 'bg-primary/10 text-primary' : 'hover:bg-accent',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'flex size-4 items-center justify-center rounded-sm border',
                              on ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                            )}
                          >
                            {on ? <Check className="size-3" /> : null}
                          </span>
                          <span className="truncate">
                            {l.qty}× {l.name}
                          </span>
                        </span>
                        <span className="tabular-nums">{money(l.lineTotal, currency)}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Seçilen</span>
                  <span className="tabular-nums">{money(itemsTotal, currency)}</span>
                </div>
              </div>
            ) : null}
            {splitMode === 'equal' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Kişi sayısı</span>
                <Input
                  type="number"
                  min={2}
                  value={splitN}
                  onChange={(e) => setSplitN(Math.max(2, Number(e.target.value) || 2))}
                  className="h-9 w-20"
                />
                <span className="text-sm text-muted-foreground">
                  → kişi başı {money(round2(remaining / Math.max(1, splitN)), currency)}
                </span>
              </div>
            ) : null}

            {/* method */}
            <div className="flex gap-1.5">
              {methods.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-xs font-medium',
                      method === m.key ? 'border-primary bg-primary/10 text-primary' : 'bg-background hover:bg-accent',
                    )}
                  >
                    <Icon className="size-5" />
                    {PAYMENT_METHOD_LABELS[m.key]}
                  </button>
                )
              })}
            </div>

            {/* account selectors */}
            {method === 'cash' ? (
              <AccountSelect label="Kasa" value={cashAccountId} onChange={setCashAccountId} options={(cashQuery.data ?? []).map((a) => ({ id: a.id, name: a.name }))} />
            ) : null}
            {method === 'card' ? (
              <AccountSelect label="Banka / POS" value={bankAccountId} onChange={setBankAccountId} options={(bankQuery.data ?? []).map((a) => ({ id: a.id, name: a.name }))} />
            ) : null}
            {method === 'account' ? (
              <AccountSelect label="Cari" value={contactId} onChange={setContactId} options={(contactsQuery.data ?? []).map((c) => ({ id: c.id, name: c.name }))} />
            ) : null}

            {/* amount + tendered */}
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-2xs text-muted-foreground">Tutar</span>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11 text-base font-semibold tabular-nums"
                />
              </label>
              {method === 'cash' ? (
                <label className="space-y-1">
                  <span className="text-2xs text-muted-foreground">Verilen (para üstü için)</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                    placeholder={amount}
                    className="h-11 text-base tabular-nums"
                  />
                </label>
              ) : null}
            </div>
            {change > 0 ? (
              <p className="text-right text-sm font-medium">Para üstü: {money(change, currency)}</p>
            ) : null}

            <Button className="h-12 w-full text-base" disabled={pay.isPending} onClick={() => pay.mutate()}>
              {pay.isPending ? 'İşleniyor…' : `Tahsil Et · ${money(Number(amount || 0), currency)}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AccountSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { id: string; name: string }[]
}) {
  return (
    <label className="block space-y-1">
      <span className="text-2xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full">
          <SelectValue placeholder={`${label} seçin`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
