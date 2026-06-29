import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { toApiError } from '@turbohesap/shared'

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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

export function LeaveTypesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  const [name, setName] = React.useState('')
  const [paid, setPaid] = React.useState(true)
  const [affectsBalance, setAffectsBalance] = React.useState(true)

  const typesQuery = useQuery({
    queryKey: ['hr', 'leave-types'],
    queryFn: () => api.hr.leaveTypes.list(),
    enabled: open,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr', 'leave-types'] })

  const createMutation = useMutation({
    mutationFn: () =>
      api.hr.leaveTypes.create({ name: name.trim(), paid, affectsAnnualBalance: affectsBalance }),
    onSuccess: () => {
      toast.success('İzin türü eklendi')
      setName('')
      void invalidate()
    },
    onError: (e) => toast.error('Eklenemedi', { description: toApiError(e).message }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.hr.leaveTypes.remove(id),
    onSuccess: () => {
      toast.success('İzin türü silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const types = typesQuery.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>İzin Türleri</DialogTitle>
          <DialogDescription>İzin türlerini yönetin (yıllık, ücretsiz, hastalık…).</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2 rounded-lg border p-3">
            {types.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">Henüz izin türü yok.</p>
            ) : (
              types.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.name}</span>
                    {t.paid ? <Badge variant="secondary">Ücretli</Badge> : <Badge variant="outline">Ücretsiz</Badge>}
                    {t.affectsAnnualBalance ? <Badge variant="info">Yıllık bakiye</Badge> : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Sil"
                    disabled={removeMutation.isPending}
                    onClick={() => {
                      if (confirm(`"${t.name}" türü silinsin mi?`)) removeMutation.mutate(t.id)
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Yeni tür adı</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="örn. Hastalık izni" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={paid} onCheckedChange={setPaid} id="lt-paid" />
              <Label htmlFor="lt-paid" className="text-sm">
                Ücretli (puantajda çalışılmış gün sayılır)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={affectsBalance} onCheckedChange={setAffectsBalance} id="lt-balance" />
              <Label htmlFor="lt-balance" className="text-sm">
                Yıllık izin bakiyesinden düşülür
              </Label>
            </div>
            <Button
              size="sm"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              <Plus className="size-4" />
              Ekle
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
