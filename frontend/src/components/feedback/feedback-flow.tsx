import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ImageOff, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import {
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPES,
  toApiError,
  type FeedbackType,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AnnotationEditor } from './annotation-editor'
import { captureScreenshot, dataUrlToFile } from './lib/capture'

/**
 * The real in-app feedback flow: captures the page on open, lets the user
 * annotate the screenshot, pick a category + write a note, then uploads the PNG
 * and creates a feedback record. Allows submitting without a screenshot too.
 */
export function FeedbackFlow({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const qc = useQueryClient()
  const [type, setType] = React.useState<FeedbackType>('request')
  const [title, setTitle] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [shot, setShot] = React.useState<string | null>(null)
  const [capturing, setCapturing] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const reset = () => {
    setType('request')
    setTitle('')
    setMessage('')
    setShot(null)
    setEditing(false)
  }

  // Capture the underlying page when the dialog opens. The dialog itself portals
  // outside #root, so it isn't included in the snapshot.
  const wasOpen = React.useRef(false)
  React.useEffect(() => {
    if (open && !wasOpen.current) {
      wasOpen.current = true
      setCapturing(true)
      captureScreenshot()
        .then(setShot)
        .catch(() => setShot(null))
        .finally(() => setCapturing(false))
    }
    if (!open && wasOpen.current) {
      wasOpen.current = false
      reset()
    }
  }, [open])

  const submit = async () => {
    if (!message.trim()) return
    setSubmitting(true)
    try {
      let screenshotFileId: string | undefined
      if (shot) {
        const file = await dataUrlToFile(shot, 'feedback-screenshot.png')
        const fd = new FormData()
        fd.append('files', file)
        fd.append('kind', 'image')
        const uploaded = await api.files.upload(fd)
        screenshotFileId = uploaded[0]?.id
      }
      await api.feedback.create({
        type,
        title: title.trim() || undefined,
        message: message.trim(),
        pageUrl: window.location.href,
        screenshotFileId,
      })
      void qc.invalidateQueries({ queryKey: ['feedback'] })
      toast.success('Geri bildiriminiz için teşekkürler!', {
        description: 'Ekibimiz en kısa sürede inceleyecektir.',
      })
      onOpenChange(false)
    } catch (e) {
      toast.error('Gönderilemedi', { description: toApiError(e).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* While annotating, close the dialog so Radix releases its modal focus
          trap / pointer-events lock — otherwise the editor renders behind it and
          can't be interacted with. Form state lives above the Dialog, so it is
          preserved across the hide/show. */}
      <Dialog open={open && !editing} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Geri bildirim gönder</DialogTitle>
            <DialogDescription>
              Nelerin iyi çalıştığını veya nelerin daha iyi olabileceğini bize bildirin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Screenshot preview */}
            <div className="space-y-2">
              <Label>Ekran görüntüsü</Label>
              <div className="relative overflow-hidden rounded-lg border bg-muted">
                {capturing ? (
                  <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Yakalanıyor…
                  </div>
                ) : shot ? (
                  <>
                    <img
                      src={shot}
                      alt="Ekran görüntüsü"
                      className="max-h-44 w-full object-contain"
                    />
                    <div className="absolute right-2 bottom-2 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditing(true)}
                      >
                        <Pencil className="size-4" />
                        İşaretle / Düzenle
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setShot(null)}
                      >
                        <ImageOff className="size-4" />
                        Kaldır
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
                    Ekran görüntüsü eklenmedi
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="feedback-type">Kategori</Label>
                <Select value={type} onValueChange={(v) => setType(v as FeedbackType)}>
                  <SelectTrigger id="feedback-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {FEEDBACK_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-title">Başlık (ops.)</Label>
                <Input
                  id="feedback-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Kısa bir özet"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">Notunuz</Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Geri bildiriminizi açıklayın…"
                className="min-h-28"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              İptal
            </Button>
            <Button onClick={() => void submit()} disabled={!message.trim() || submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && shot ? (
        <AnnotationEditor
          imageSrc={shot}
          onSave={(_file, dataUrl) => {
            setShot(dataUrl)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : null}
    </>
  )
}
