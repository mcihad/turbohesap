import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  toApiError,
  type AssetDto,
  type AssetStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
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
import { Textarea } from '@/components/ui/textarea'

/** "Durum İşlemleri" — change an asset's lifecycle status (depoda/kayıp/hurda…). */
export function ChangeStatusDialog({
  open,
  onOpenChange,
  asset,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: AssetDto
  onSaved: () => void
}) {
  const [status, setStatus] = React.useState<AssetStatus>(asset.status)
  const [reason, setReason] = React.useState('')
  const [note, setNote] = React.useState('')
  const [date, setDate] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setStatus(asset.status)
      setReason('')
      setNote('')
      setDate('')
    }
  }, [open, asset.status])

  const save = useMutation({
    mutationFn: () =>
      api.inventory.assets.changeStatus(asset.id, {
        status,
        reason: reason.trim() || null,
        note: note.trim() || null,
        date: date.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Durum güncellendi')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Durum işlemleri</DialogTitle>
          <DialogDescription>
            Demirbaşın durumunu değiştirin. Pasif/kayıp/hurda/çıkış durumları aktif zimmeti kapatır.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Durum</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AssetStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ASSET_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Gerekçe</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tarih</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Not</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
