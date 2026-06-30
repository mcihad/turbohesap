import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { toApiError, type AssetTransferDto } from '@turbohesap/shared'

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
import { Textarea } from '@/components/ui/textarea'
import { EmployeeSelect } from './asset-pickers'

/**
 * "Devret" — start a custody transfer handshake. After `initiate`, the returned
 * token is shown prominently (web has no QR lib): the receiver reads the code in
 * the mobile app and confirms "Devraldım".
 */
export function TransferDialog({
  open,
  onOpenChange,
  assetId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetId: string
  onSaved: () => void
}) {
  const [toEmployeeId, setToEmployeeId] = React.useState<string | null>(null)
  const [expiresInMinutes, setExpiresInMinutes] = React.useState('60')
  const [notes, setNotes] = React.useState('')
  const [result, setResult] = React.useState<AssetTransferDto | null>(null)

  React.useEffect(() => {
    if (open) {
      setToEmployeeId(null)
      setExpiresInMinutes('60')
      setNotes('')
      setResult(null)
    }
  }, [open])

  const save = useMutation({
    mutationFn: () =>
      api.inventory.assetTransfers.initiate({
        assetId,
        toEmployeeId,
        expiresInMinutes: Number(expiresInMinutes) || undefined,
        notes: notes.trim() || null,
      }),
    onSuccess: (transfer) => {
      toast.success('Devir başlatıldı')
      setResult(transfer)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const copyToken = () => {
    if (!result) return
    void navigator.clipboard?.writeText(result.token)
    toast.success('Kod kopyalandı')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zimmeti devret</DialogTitle>
          <DialogDescription>
            Devir kodu oluşturun. Devralacak kişi mobil uygulamadan bu kodu okutup
            “Devraldım” demelidir.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Devir kodu</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-lg tracking-wider">
                  {result.token}
                </code>
                <Button variant="outline" size="icon" onClick={copyToken} title="Kopyala">
                  <Copy />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Devralacak kişi mobil uygulamadan bu kodu okutup “Devraldım” demeli.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Devralacak personel (opsiyonel)</Label>
              <EmployeeSelect value={toEmployeeId} onChange={setToEmployeeId} allowNone placeholder="Herkes devralabilir" />
            </div>
            <div className="space-y-1.5">
              <Label>Geçerlilik (dakika)</Label>
              <Input
                type="number"
                value={expiresInMinutes}
                onChange={(e) => setExpiresInMinutes(e.target.value)}
                className="w-32"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Not</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Kapat</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                Devir başlat
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
