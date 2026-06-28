// Çok kanallı mesaj gönderme penceresi — kanal (e-posta/Telegram/WhatsApp/SMS),
// alıcı, konu (yalnız e-posta) ve gövde. "AI taslağı" butonu Claude ile gövdeyi
// doldurur. Gönder → integrations.send; sonuç toast ile bildirilir.

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import {
  MESSAGE_CHANNELS,
  toApiError,
  type MessageChannel,
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CHANNEL_LABEL: Record<MessageChannel, string> = {
  email: 'E-posta',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
}

const TO_PLACEHOLDER: Record<MessageChannel, string> = {
  email: 'ad@example.com',
  telegram: 'Chat ID',
  whatsapp: '+90...',
  sms: '+90...',
}

export function SendMessageDialog({
  open,
  onOpenChange,
  contactId,
  opportunityId,
  defaults,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId?: string
  opportunityId?: string
  defaults?: { channel: MessageChannel; to: string }
}) {
  const [channel, setChannel] = React.useState<MessageChannel>(defaults?.channel ?? 'email')
  const [to, setTo] = React.useState(defaults?.to ?? '')
  const [subject, setSubject] = React.useState('')
  const [body, setBody] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setChannel(defaults?.channel ?? 'email')
      setTo(defaults?.to ?? '')
      setSubject('')
      setBody('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const draft = useMutation({
    mutationFn: () =>
      api.contacts.integrations.aiDraftEmail({
        prompt: body.trim() || 'kısa tanıtım',
        contactId: contactId ?? null,
      }),
    onSuccess: (res) => {
      if (res.text?.trim()) {
        setBody(res.text)
        toast.success('Taslak oluşturuldu')
      } else {
        toast.error('Taslak boş döndü', { description: 'Farklı bir model deneyin veya tekrar deneyin.' })
      }
    },
    onError: (e) => toast.error('Taslak oluşturulamadı', { description: toApiError(e).message }),
  })

  const send = useMutation({
    mutationFn: () =>
      api.contacts.integrations.send({
        channel,
        to: to.trim(),
        subject: channel === 'email' ? subject.trim() || undefined : undefined,
        body,
        contactId: contactId ?? null,
        opportunityId: opportunityId ?? null,
      }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success('Mesaj gönderildi', { description: res.message })
        onOpenChange(false)
      } else {
        toast.error('Gönderilemedi', { description: res.message })
      }
    },
    onError: (e) => toast.error('Gönderilemedi', { description: toApiError(e).message }),
  })

  const canSend = to.trim().length > 0 && body.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mesaj gönder</DialogTitle>
          <DialogDescription>Bir kanal seçin ve mesajınızı gönderin.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kanal</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as MessageChannel)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CHANNEL_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Alıcı</Label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder={TO_PLACEHOLDER[channel]}
              />
            </div>
          </div>

          {channel === 'email' ? (
            <div className="space-y-1.5">
              <Label>Konu</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Konu" />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>Mesaj</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => draft.mutate()}
                disabled={draft.isPending}
              >
                {draft.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
                AI taslağı
              </Button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Mesajınızı yazın veya AI ile taslak oluşturun…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => send.mutate()} disabled={send.isPending || !canSend}>
            {send.isPending ? <Loader2 className="animate-spin" /> : <Send />}
            Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
