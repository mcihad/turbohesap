import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  toApiError,
  type OpportunityDto,
  type PipelineDto,
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
import { Textarea } from '@/components/ui/textarea'
import { OwnerSelect } from './owner-select'
import { CrmAttributeSection } from './crm-attribute-section'

interface FormState {
  contactId: string
  name: string
  pipelineId: string
  stageId: string
  amount: string
  currencyCode: string
  probability: string
  expectedCloseDate: string
  source: string
  ownerId: string | null
  notes: string
}

function emptyForm(contactId?: string): FormState {
  return {
    contactId: contactId ?? '',
    name: '',
    pipelineId: '',
    stageId: '',
    amount: '0',
    currencyCode: 'TRY',
    probability: '0',
    expectedCloseDate: '',
    source: '',
    ownerId: null,
    notes: '',
  }
}

export function OpportunityDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  contactId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: OpportunityDto | null
  onSaved: (saved: OpportunityDto) => void
  contactId?: string
}) {
  const { hasPermission } = useAuth()
  const [form, setForm] = React.useState<FormState>(() => emptyForm(contactId))
  const [attributes, setAttributes] = React.useState<Record<string, unknown>>({})
  // Whether the user has manually edited probability — if so we stop
  // auto-defaulting it when the stage changes.
  const probabilityTouched = React.useRef(false)

  const contactsQuery = useQuery({
    queryKey: ['contacts', 'contacts'],
    queryFn: () => api.contacts.contacts.list(),
    enabled: open && hasPermission(ContactsPermissions.contactsRead),
  })

  const pipelinesQuery = useQuery({
    queryKey: ['contacts', 'pipelines'],
    queryFn: () => api.contacts.pipelines.list(),
    enabled: open,
  })

  const pipelines = React.useMemo<PipelineDto[]>(
    () => pipelinesQuery.data ?? [],
    [pipelinesQuery.data],
  )

  // Initialise the form once pipelines are loaded so we can default the
  // pipeline/stage selection for new deals.
  const initialisedFor = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!open) {
      initialisedFor.current = null
      return
    }
    if (pipelines.length === 0) return
    const key = editing?.id ?? '__new__'
    if (initialisedFor.current === key) return
    initialisedFor.current = key

    probabilityTouched.current = !!editing
    setAttributes(editing?.attributes ?? {})

    if (editing) {
      setForm({
        contactId: editing.contactId,
        name: editing.name,
        pipelineId: editing.pipelineId,
        stageId: editing.stageId,
        amount: String(editing.amount),
        currencyCode: editing.currencyCode,
        probability: String(editing.probability),
        expectedCloseDate: editing.expectedCloseDate
          ? editing.expectedCloseDate.slice(0, 10)
          : '',
        source: editing.source ?? '',
        ownerId: editing.ownerId,
        notes: editing.notes ?? '',
      })
      return
    }

    const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0]
    const firstStage = sortStages(defaultPipeline.stages)[0]
    setForm({
      ...emptyForm(contactId),
      pipelineId: defaultPipeline.id,
      stageId: firstStage?.id ?? '',
      probability: firstStage ? String(firstStage.probability) : '0',
    })
  }, [open, editing, contactId, pipelines])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const currentPipeline = pipelines.find((p) => p.id === form.pipelineId)
  const stages = currentPipeline ? sortStages(currentPipeline.stages) : []

  const onPipelineChange = (pipelineId: string) => {
    const pipeline = pipelines.find((p) => p.id === pipelineId)
    const firstStage = pipeline ? sortStages(pipeline.stages)[0] : undefined
    setForm((f) => ({
      ...f,
      pipelineId,
      stageId: firstStage?.id ?? '',
      probability:
        probabilityTouched.current || !firstStage
          ? f.probability
          : String(firstStage.probability),
    }))
  }

  const onStageChange = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId)
    setForm((f) => ({
      ...f,
      stageId,
      probability:
        probabilityTouched.current || !stage ? f.probability : String(stage.probability),
    }))
  }

  const save = useMutation({
    mutationFn: () => {
      const base = {
        name: form.name.trim(),
        pipelineId: form.pipelineId,
        stageId: form.stageId,
        amount: Number(form.amount) || 0,
        currencyCode: form.currencyCode,
        probability: Number(form.probability) || 0,
        expectedCloseDate: form.expectedCloseDate || null,
        source: form.source.trim() || null,
        ownerId: form.ownerId,
        notes: form.notes.trim() || null,
        attributes,
      }
      return editing
        ? api.contacts.opportunities.update(editing.id, base)
        : api.contacts.opportunities.create({ contactId: form.contactId, ...base })
    },
    onSuccess: (saved) => {
      toast.success(editing ? 'Fırsat güncellendi' : 'Fırsat oluşturuldu')
      onOpenChange(false)
      onSaved(saved)
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const contacts = contactsQuery.data ?? []
  const canSave =
    form.name.trim().length > 0 && form.contactId.length > 0 && form.stageId.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto px-1 sm:max-w-xl">
        <div className="px-5">
          <DialogHeader>
            <DialogTitle>{editing ? 'Fırsatı düzenle' : 'Yeni fırsat'}</DialogTitle>
            <DialogDescription>Satış fırsatı bilgileri.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <Field label="Cari">
              <Select
                value={form.contactId}
                onValueChange={(v) => set('contactId', v)}
                disabled={!!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Cari seçin" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Fırsat adı">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pipeline">
                <Select value={form.pipelineId} onValueChange={onPipelineChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pipeline seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Aşama">
                <Select value={form.stageId} onValueChange={onStageChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aşama seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Sorumlu">
                <OwnerSelect value={form.ownerId} onChange={(v) => set('ownerId', v)} />
              </Field>
              <Field label="Olasılık (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.probability}
                  onChange={(e) => {
                    probabilityTouched.current = true
                    set('probability', e.target.value)
                  }}
                />
              </Field>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label="Tutar">
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                />
              </Field>
              <Field label="Para">
                <Input
                  value={form.currencyCode}
                  onChange={(e) => set('currencyCode', e.target.value)}
                  className="w-20"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tahmini kapanış">
                <Input
                  type="date"
                  value={form.expectedCloseDate}
                  onChange={(e) => set('expectedCloseDate', e.target.value)}
                />
              </Field>
              <Field label="Kaynak">
                <Input value={form.source} onChange={(e) => set('source', e.target.value)} />
              </Field>
            </div>

            <Field label="Notlar">
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
            </Field>

            <CrmAttributeSection
              entity="opportunity"
              enabled={open}
              values={attributes}
              onChange={(key, value) => setAttributes((a) => ({ ...a, [key]: value }))}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !canSave}>
              {editing ? 'Kaydet' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function sortStages<T extends { sortOrder: number }>(stages: T[]): T[] {
  return [...stages].sort((a, b) => a.sortOrder - b.sortOrder)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
