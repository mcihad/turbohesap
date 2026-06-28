import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { toApiError, type OpportunityDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/** Close a deal as won/lost, capturing an optional reason. */
export function CloseOpportunityDialog({
  open,
  onOpenChange,
  opportunity,
  onClosed,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: OpportunityDto | null
  onClosed: (saved: OpportunityDto) => void
}) {
  const [result, setResult] = React.useState<'won' | 'lost'>('won')
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setResult('won')
      setReason('')
    }
  }, [open])

  const close = useMutation({
    mutationFn: () =>
      api.contacts.opportunities.close(opportunity!.id, {
        result,
        reason: reason.trim() || null,
      }),
    onSuccess: (saved) => {
      toast.success(result === 'won' ? 'Fırsat kazanıldı 🎉' : 'Fırsat kaybedildi olarak işaretlendi')
      onOpenChange(false)
      onClosed(saved)
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fırsatı kapat</DialogTitle>
          <DialogDescription>
            {opportunity?.name} fırsatını sonuçlandırın.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setResult('won')}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-colors',
                result === 'won'
                  ? 'border-success bg-success/10 text-success'
                  : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              <CheckCircle2 className="size-6" />
              <span className="text-sm font-medium">Kazanıldı</span>
            </button>
            <button
              type="button"
              onClick={() => setResult('lost')}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-colors',
                result === 'lost'
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              <XCircle className="size-6" />
              <span className="text-sm font-medium">Kaybedildi</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>{result === 'won' ? 'Kazanma nedeni' : 'Kaybetme nedeni'} (opsiyonel)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder={result === 'won' ? 'Örn: Fiyat avantajı' : 'Örn: Bütçe yetersiz'}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button
            onClick={() => close.mutate()}
            disabled={close.isPending || !opportunity}
            variant={result === 'won' ? 'default' : 'destructive'}
          >
            {result === 'won' ? 'Kazanıldı olarak kapat' : 'Kaybedildi olarak kapat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
