import * as React from 'react'
import { toast } from 'sonner'
import { Bug, Lightbulb, MessageSquare } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const KINDS = [
  { id: 'idea', label: 'Fikir', icon: Lightbulb },
  { id: 'issue', label: 'Sorun', icon: Bug },
  { id: 'other', label: 'Diğer', icon: MessageSquare },
] as const

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [kind, setKind] = React.useState<string>('idea')
  const [message, setMessage] = React.useState('')

  const submit = () => {
    onOpenChange(false)
    setMessage('')
    toast.success('Geri bildiriminiz için teşekkürler!', {
      description: 'Ekibimiz en kısa sürede inceleyecektir.',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Geri bildirim gönder</DialogTitle>
          <DialogDescription>
            Nelerin iyi çalıştığını veya nelerin daha iyi olabileceğini bize bildirin.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setKind(id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors',
                  kind === id
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Mesaj</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Geri bildiriminizi açıklayın..."
              className="min-h-28"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={submit} disabled={!message.trim()}>
            Geri bildirim gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
