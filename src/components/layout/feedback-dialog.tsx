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
  { id: 'idea', label: 'Idea', icon: Lightbulb },
  { id: 'issue', label: 'Issue', icon: Bug },
  { id: 'other', label: 'Other', icon: MessageSquare },
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
    toast.success('Thanks for the feedback!', {
      description: 'Our team will review it shortly.',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Tell us what’s working or what could be better.
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
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your feedback..."
              className="min-h-28"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!message.trim()}>
            Send feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
