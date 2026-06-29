import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Banknote, CheckCircle2, CreditCard, Receipt, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { toApiError, type PosSessionDto } from '@turbohesap/shared'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { money } from '../labels'

// Vardiya (session) summary + close. Shows live cash/card takings; cash & card
// post to finance ONCE at close (one aggregated transaction each, vezne). After
// close, surfaces that the takings were posted.
export function SessionDialog({
  open,
  session,
  registerId,
  onClose,
}: {
  open: boolean
  session: PosSessionDto
  registerId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [counted, setCounted] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [closed, setClosed] = React.useState<PosSessionDto | null>(
    session.status === 'closed' ? session : null,
  )

  React.useEffect(() => {
    if (open) {
      setClosed(session.status === 'closed' ? session : null)
      setCounted('')
      setNotes('')
    }
  }, [open, session])

  const close = useMutation({
    mutationFn: () =>
      api.pos.sessions.close(session.id, {
        countedCash: counted === '' ? undefined : Number(counted),
        notes: notes || null,
      }),
    onSuccess: (s) => {
      setClosed(s)
      toast.success('Vardiya kapatıldı', {
        description: 'Kasa ve kart tahsilatları muhasebeye işlendi.',
      })
      qc.invalidateQueries({ queryKey: ['pos', 'session', 'current', registerId] })
      qc.invalidateQueries({ queryKey: ['pos', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['pos', 'registers'] })
      qc.invalidateQueries({ queryKey: ['finance'] })
    },
    onError: (e) => toast.error('Kapatılamadı', { description: toApiError(e).message }),
  })

  const view = closed ?? session
  const posted = !!(view.cashFinanceTxId || view.cardFinanceTxId)

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Vardiya — {view.registerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat icon={Receipt} label="Satış" value={money(view.salesTotal)} sub={`${view.orderCount} fiş`} />
            <Stat icon={Wallet} label="Beklenen nakit" value={money(view.expectedCash)} sub={`açılış ${money(view.openingCash)}`} />
            <Stat icon={Banknote} label="Nakit tahsilat" value={money(view.expectedCash - view.openingCash)} />
            <Stat icon={CreditCard} label="Kart tahsilat" value={money(view.cardTotal)} />
          </div>

          {closed ? (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-emerald-600">
                <CheckCircle2 className="size-4" />
                Vardiya kapatıldı
              </div>
              <div className="space-y-1 text-2xs text-muted-foreground">
                {closed.closedByName ? <p>Kapatan: {closed.closedByName}</p> : null}
                {closed.countedCash != null ? <p className="tabular-nums">Sayılan nakit: {money(closed.countedCash)}</p> : null}
                <p className="tabular-nums">
                  Kasa farkı:{' '}
                  {closed.countedCash != null ? money(closed.countedCash - closed.expectedCash) : '—'}
                </p>
              </div>
              {posted ? (
                <p className="rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-2xs font-medium text-emerald-600">
                  Tahsilatlar muhasebeye işlendi (vezne).
                </p>
              ) : null}
              <Button className="w-full" onClick={onClose}>Tamam</Button>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label className="text-2xs text-muted-foreground">Sayılan nakit (kasa)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={counted}
                    onChange={(e) => setCounted(e.target.value)}
                    placeholder={view.expectedCash.toFixed(2)}
                    className="h-11 text-base tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-2xs text-muted-foreground">Not (ops.)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>
              <Button className="h-12 w-full text-base" disabled={close.isPending} onClick={() => close.mutate()}>
                {close.isPending ? 'Kapatılıyor…' : 'Vardiyayı Kapat'}
              </Button>
              <p className="text-center text-2xs text-muted-foreground">
                Kapanışta nakit ve kart tahsilatları tek seferde muhasebeye işlenir.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Banknote
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-0.5 text-lg font-bold leading-tight tabular-nums">{value}</p>
      {sub ? <p className="text-[10px] text-muted-foreground tabular-nums">{sub}</p> : null}
    </div>
  )
}
