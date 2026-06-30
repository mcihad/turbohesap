import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toApiError } from '@turbohesap/shared'

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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmployeeSelect } from './asset-pickers'

/** "Zimmet Ver" — assign an asset to a personel. Saves only on submit. */
export function AssignDialog({
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
  const [employeeId, setEmployeeId] = React.useState<string | null>(null)
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setEmployeeId(null)
      setNotes('')
    }
  }, [open])

  const save = useMutation({
    mutationFn: () =>
      api.inventory.assetAssignments.assign({
        assetId,
        employeeId: employeeId as string,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Zimmet verildi')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zimmet ver</DialogTitle>
          <DialogDescription>Demirbaşı bir personele zimmetleyin.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Personel</Label>
            <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
          </div>
          <div className="space-y-1.5">
            <Label>Not</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !employeeId}>
            Zimmetle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
