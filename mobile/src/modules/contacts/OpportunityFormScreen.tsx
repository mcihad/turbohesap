import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { ContactsPermissions } from '@turbohesap/shared'
import {
  Button,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormTextArea,
  Input,
  Screen,
  Section,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { CrmAttributeFields } from './CrmAttributeFields'

const UNASSIGNED = ''

interface FormState {
  contactId: string
  name: string
  pipelineId: string
  stageId: string
  ownerId: string
  amount: string
  currencyCode: string
  probability: string
  expectedCloseDate: string
  source: string
  notes: string
}

const EMPTY: FormState = {
  contactId: '',
  name: '',
  pipelineId: '',
  stageId: '',
  ownerId: UNASSIGNED,
  amount: '0',
  currencyCode: 'TRY',
  probability: '0',
  expectedCloseDate: '',
  source: '',
  notes: '',
}

const userLabel = (u: { firstName: string; lastName: string; username: string }) =>
  `${u.firstName} ${u.lastName}`.trim() || u.username

export function OpportunityFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.contacts.opportunities.get(id as string), [id], {
    enabled: editing,
  })

  const contacts = useAsync(() => api.contacts.contacts.list(), [], { enabled: !editing })
  const pipelines = useAsync(() => api.contacts.pipelines.list(), [])
  const users = useAsync(() => api.iam.users.list(), [])
  const fieldDefs = useAsync(() => api.contacts.fields.get('opportunity'), [])

  const contactOptions = React.useMemo<SelectOption<string>[]>(
    () => (contacts.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [contacts.data],
  )
  const pipelineOptions = React.useMemo<SelectOption<string>[]>(
    () => (pipelines.data ?? []).map((p) => ({ value: p.id, label: p.isDefault ? `${p.name} (Varsayılan)` : p.name })),
    [pipelines.data],
  )
  const ownerOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: UNASSIGNED, label: 'Atanmamış' }, ...(users.data ?? []).map((u) => ({ value: u.id, label: userLabel(u) }))],
    [users.data],
  )

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [attributes, setAttributes] = React.useState<Record<string, unknown>>({})
  const [probabilityTouched, setProbabilityTouched] = React.useState(false)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))
  const setAttr = (key: string, value: unknown) =>
    setAttributes((a) => ({ ...a, [key]: value }))

  // Stages of the currently-selected pipeline, ordered.
  const stages = React.useMemo(() => {
    const p = (pipelines.data ?? []).find((x) => x.id === form.pipelineId)
    return p ? [...p.stages].sort((a, b) => a.sortOrder - b.sortOrder) : []
  }, [pipelines.data, form.pipelineId])

  const stageOptions = React.useMemo<SelectOption<string>[]>(
    () => stages.map((s) => ({ value: s.id, label: s.name })),
    [stages],
  )

  // Hydrate from the existing opportunity when editing.
  React.useEffect(() => {
    if (existing.data) {
      setForm({
        contactId: existing.data.contactId,
        name: existing.data.name,
        pipelineId: existing.data.pipelineId,
        stageId: existing.data.stageId,
        ownerId: existing.data.ownerId ?? UNASSIGNED,
        amount: String(existing.data.amount),
        currencyCode: existing.data.currencyCode,
        probability: String(existing.data.probability),
        expectedCloseDate: existing.data.expectedCloseDate ?? '',
        source: existing.data.source ?? '',
        notes: existing.data.notes ?? '',
      })
      setAttributes(existing.data.attributes ?? {})
      setProbabilityTouched(true)
    }
  }, [existing.data])

  // Default to the default pipeline + its first stage when creating.
  React.useEffect(() => {
    if (editing || form.pipelineId || !pipelines.data || pipelines.data.length === 0) return
    const def = pipelines.data.find((p) => p.isDefault) ?? pipelines.data[0]
    if (!def) return
    const first = [...def.stages].sort((a, b) => a.sortOrder - b.sortOrder)[0]
    setForm((f) => ({
      ...f,
      pipelineId: def.id,
      stageId: first?.id ?? '',
      probability: probabilityTouched ? f.probability : String(first?.probability ?? 0),
    }))
  }, [editing, pipelines.data, form.pipelineId, probabilityTouched])

  const handlePipelineChange = (pipelineId: string) => {
    const p = (pipelines.data ?? []).find((x) => x.id === pipelineId)
    const first = p ? [...p.stages].sort((a, b) => a.sortOrder - b.sortOrder)[0] : undefined
    setForm((f) => ({
      ...f,
      pipelineId,
      stageId: first?.id ?? '',
      probability: probabilityTouched ? f.probability : String(first?.probability ?? 0),
    }))
  }

  const handleStageChange = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId)
    setForm((f) => ({
      ...f,
      stageId,
      probability: probabilityTouched ? f.probability : String(stage?.probability ?? f.probability),
    }))
  }

  const handleProbabilityChange = (v: string) => {
    setProbabilityTouched(true)
    set('probability', v)
  }

  const handleSave = () => {
    if (!editing && !form.contactId) {
      alert('Cari seçilmelidir')
      return
    }
    if (!form.name.trim()) {
      alert('Fırsat adı girilmelidir')
      return
    }
    if (!form.pipelineId || !form.stageId) {
      alert('Satış hattı ve aşama seçilmelidir')
      return
    }

    submit(async () => {
      const payload = {
        name: form.name.trim(),
        pipelineId: form.pipelineId,
        stageId: form.stageId,
        ownerId: form.ownerId || null,
        amount: Number(form.amount) || 0,
        currencyCode: form.currencyCode.trim() || 'TRY',
        probability: Number(form.probability) || 0,
        expectedCloseDate: form.expectedCloseDate || null,
        source: form.source.trim() || null,
        notes: form.notes.trim() || null,
        attributes,
      }

      if (editing) {
        await api.contacts.opportunities.update(id as string, payload)
      } else {
        await api.contacts.opportunities.create({ contactId: form.contactId, ...payload })
      }
      nav.goBack()
    })
  }

  if (!hasPermission(ContactsPermissions.opportunitiesWrite)) {
    return (
      <Screen header={{ title: editing ? 'Fırsatı Düzenle' : 'Yeni Fırsat', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: editing ? 'Fırsatı Düzenle' : 'Yeni Fırsat',
        onBack: nav.goBack,
      }}
      footer={
        !(editing && existing.loading) ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button title="Vazgeç" variant="outline" fullWidth onPress={nav.goBack} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Kaydet" fullWidth loading={busy} onPress={handleSave} />
            </View>
          </View>
        ) : undefined
      }
    >
      {editing && existing.loading ? (
        <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <Section title="Genel Bilgiler">
            {editing ? (
              <Input label="Cari" value={existing.data?.contact?.name ?? ''} editable={false} />
            ) : (
              <FormSelect
                label="Cari"
                value={form.contactId}
                onChange={(v: string) => set('contactId', v)}
                options={contactOptions}
              />
            )}

            <Input label="Fırsat Adı" placeholder="Örn: Yıllık bakım sözleşmesi" value={form.name} onChangeText={(v) => set('name', v)} />

            <FormSelect label="Satış Hattı" value={form.pipelineId} onChange={handlePipelineChange} options={pipelineOptions} />

            <FormSelect label="Aşama" value={form.stageId} onChange={handleStageChange} options={stageOptions} />

            <FormSelect label="Sorumlu" value={form.ownerId} onChange={(v: string) => set('ownerId', v)} options={ownerOptions} />
          </Section>

          <Section title="Tutar ve Olasılık">
            <Input
              label="Tutar"
              keyboardType="numeric"
              placeholder="0.00"
              value={form.amount}
              onChangeText={(v) => set('amount', v)}
            />

            <Input label="Para Birimi" placeholder="TRY" value={form.currencyCode} onChangeText={(v) => set('currencyCode', v)} />

            <Input
              label="Kazanma Olasılığı (%)"
              keyboardType="numeric"
              placeholder="0-100"
              value={form.probability}
              onChangeText={handleProbabilityChange}
            />

            <FormDatePicker label="Tahmini Kapanış" value={form.expectedCloseDate} onChange={(v) => set('expectedCloseDate', v)} mode="date" />
          </Section>

          <Section title="Detaylar">
            <Input label="Kaynak" placeholder="Örn: Web sitesi, referans" value={form.source} onChangeText={(v) => set('source', v)} />

            <FormTextArea label="Notlar" placeholder="Fırsat detayları..." value={form.notes} onChangeText={(v) => set('notes', v)} />
          </Section>

          {fieldDefs.data && fieldDefs.data.fields.length > 0 ? (
            <Section title="Ek Alanlar">
              <CrmAttributeFields fields={fieldDefs.data.fields} values={attributes} onChange={setAttr} />
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  )
}
