import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  QUALITY_TYPE_LABELS,
  ProductionPermissions,
  toApiError,
  type QualityCheckResult,
  type QualityCheckType,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Textarea } from '@/components/ui/textarea'

const QUALITY_TYPES: QualityCheckType[] = ['operation', 'final', 'incoming']

export function QualityRecordDialog({
  open,
  onOpenChange,
  manufacturingOrderId,
  workOrderId,
  defaultCheckType = 'operation',
  defaultQuantity,
  onRecorded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  manufacturingOrderId: string
  workOrderId?: string | null
  defaultCheckType?: QualityCheckType
  defaultQuantity?: number
  onRecorded?: () => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(ProductionPermissions.qualityManage)

  const [checkType, setCheckType] = React.useState<QualityCheckType>(defaultCheckType)
  const [result, setResult] = React.useState<QualityCheckResult>('pass')
  const [inspected, setInspected] = React.useState('')
  const [passed, setPassed] = React.useState('')
  const [rejected, setRejected] = React.useState('')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setCheckType(defaultCheckType)
    setResult('pass')
    setInspected(defaultQuantity != null ? String(defaultQuantity) : '')
    setPassed(defaultQuantity != null ? String(defaultQuantity) : '')
    setRejected('')
    setNotes('')
  }, [open, defaultCheckType, defaultQuantity])

  const mutation = useMutation({
    mutationFn: () =>
      api.production.qualityChecks.record({
        manufacturingOrderId,
        workOrderId: workOrderId ?? null,
        checkType,
        result,
        inspectedQuantity: inspected ? Number(inspected) : undefined,
        passedQuantity: passed ? Number(passed) : undefined,
        rejectedQuantity: rejected ? Number(rejected) : undefined,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Kalite kaydı eklendi')
      void qc.invalidateQueries({ queryKey: ['production', 'quality'] })
      void qc.invalidateQueries({ queryKey: ['production', 'work-orders'] })
      onOpenChange(false)
      onRecorded?.()
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kalite Kaydı</DialogTitle>
          <DialogDescription>
            Operasyon/mamul bazlı geçti/kaldı kaydı. Kalite gereken iş emri, geçen kayıt olmadan bitirilemez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Kontrol Türü</Label>
            <Select value={checkType} onValueChange={(v) => setCheckType(v as QualityCheckType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {QUALITY_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Sonuç</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={result}
              onValueChange={(v) => {
                if (v) setResult(v as QualityCheckResult)
              }}
              className="w-full"
            >
              <ToggleGroupItem value="pass" className="flex-1 data-[state=on]:bg-success/15 data-[state=on]:text-success">
                Geçti
              </ToggleGroupItem>
              <ToggleGroupItem value="fail" className="flex-1 data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive">
                Kaldı
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="q-insp">İncelenen</Label>
              <Input id="q-insp" type="number" value={inspected} onChange={(e) => setInspected(e.target.value)} className="text-right tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-pass">Geçen</Label>
              <Input id="q-pass" type="number" value={passed} onChange={(e) => setPassed(e.target.value)} className="text-right tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-rej">Reddedilen</Label>
              <Input id="q-rej" type="number" value={rejected} onChange={(e) => setRejected(e.target.value)} className="text-right tabular-nums" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-notes">Notlar</Label>
            <Textarea id="q-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canManage || mutation.isPending}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
