// DocumentFormScreen — create or edit an evrak. Category picker (read-only tree
// selection), a free-form tags editor, süreli (time-bound) fields revealed by a
// switch, a simplified kişiye özel (private) switch (mobile defaults the owner
// to the current user — no full user-picker, per the mobile scope decision),
// and category-driven dynamic attributes. Gated by documents.documents.write.

import * as React from 'react'
import { Alert, Pressable, View } from 'react-native'

import {
  type CreateDocumentRequest,
  DocumentsPermissions,
  effectiveDocumentFieldDefsWithSource,
  missingRequiredDocumentAttributes,
} from '@turbohesap/shared'

import {
  Button,
  EmptyState,
  FormSwitchRow,
  FormTextArea,
  Icon,
  Input,
  Screen,
  Section,
  Text,
} from '../../components'
import { FormDatePicker } from '../../components/form'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { CategoryPicker } from './CategoryPicker'
import { DynamicAttributeFields } from './DynamicAttributeFields'

interface FormState {
  title: string
  code: string
  description: string
  categoryId: string | null
  tags: string[]
  isTimeBound: boolean
  issueDate: string
  expiryDate: string
  reminderDaysBefore: string
  isPrivate: boolean
  attributes: Record<string, unknown>
}

const EMPTY: FormState = {
  title: '',
  code: '',
  description: '',
  categoryId: null,
  tags: [],
  isTimeBound: false,
  issueDate: '',
  expiryDate: '',
  reminderDaysBefore: '',
  isPrivate: false,
  attributes: {},
}

export function DocumentFormScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission, user } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()
  const existing = useAsync(() => api.documents.documents.get(id as string), [id], { enabled: editing })
  const categories = useAsync(() => api.documents.categories.list(), [], {
    enabled: hasPermission(DocumentsPermissions.categoriesRead),
  })
  const canPrivateManage = hasPermission(DocumentsPermissions.privateManage)

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [tagInput, setTagInput] = React.useState('')
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))
  const dynamicFields = React.useMemo(
    () => effectiveDocumentFieldDefsWithSource(form.categoryId, categories.data ?? []),
    [form.categoryId, categories.data],
  )

  // A viewer without privateManage can't flip the privacy of a document they
  // don't own — mirrors the backend's `privacyChangeNeedsManage` guard.
  const ownerLocked = editing && !!existing.data?.ownerId && existing.data.ownerId !== user?.id && !canPrivateManage

  React.useEffect(() => {
    const d = existing.data
    if (!d) return
    setForm({
      title: d.title,
      code: d.code,
      description: d.description,
      categoryId: d.categoryId,
      tags: d.tags ?? [],
      isTimeBound: d.isTimeBound,
      issueDate: d.issueDate ?? '',
      expiryDate: d.expiryDate ?? '',
      reminderDaysBefore: d.reminderDaysBefore != null ? String(d.reminderDaysBefore) : '',
      isPrivate: d.isPrivate,
      attributes: d.attributes ?? {},
    })
  }, [existing.data])

  if (!hasPermission(DocumentsPermissions.documentsWrite)) {
    return (
      <Screen header={{ title: 'Evrak', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem için izniniz yok." />
      </Screen>
    )
  }

  function addTag() {
    const v = tagInput.trim()
    if (!v) return
    if (!form.tags.includes(v)) set('tags', [...form.tags, v])
    setTagInput('')
  }

  function save() {
    const flat = dynamicFields.map((s) => s.def)
    const missing = missingRequiredDocumentAttributes(flat, form.attributes)
    if (missing.length > 0) {
      const labels = flat.filter((f) => missing.includes(f.key)).map((f) => f.label)
      Alert.alert('Zorunlu alanlar', `Lütfen doldurun: ${labels.join(', ')}`)
      return
    }
    const payload: CreateDocumentRequest = {
      title: form.title.trim(),
      categoryId: form.categoryId,
      code: form.code.trim() || undefined,
      description: form.description,
      tags: form.tags,
      attributes: form.attributes,
      isTimeBound: form.isTimeBound,
      issueDate: form.isTimeBound && form.issueDate ? new Date(form.issueDate).toISOString() : null,
      expiryDate: form.isTimeBound && form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
      reminderDaysBefore:
        form.isTimeBound && form.reminderDaysBefore.trim() !== '' ? Number(form.reminderDaysBefore) : null,
      isPrivate: form.isPrivate,
    }
    void submit(
      async () => {
        if (editing) {
          await api.documents.documents.update(id as string, payload)
        } else {
          await api.documents.documents.create(payload)
        }
      },
      { onSuccess: nav.goBack },
    )
  }

  const canSave = form.title.trim() !== ''

  return (
    <Screen
      header={{ title: editing ? 'Evrakı düzenle' : 'Yeni evrak', onBack: nav.goBack }}
      footer={<Button title={editing ? 'Kaydet' : 'Oluştur'} fullWidth loading={busy} disabled={!canSave} onPress={save} />}
    >
      <Section title="Genel">
        <Input label="Başlık" value={form.title} onChangeText={(v) => set('title', v)} placeholder="Evrak başlığı" />
        <Input label="Kod" value={form.code} onChangeText={(v) => set('code', v)} placeholder="Opsiyonel" />
        <CategoryPicker value={form.categoryId} onChange={(v) => set('categoryId', v)} />
        <FormTextArea label="Açıklama" value={form.description} onChangeText={(v) => set('description', v)} />
      </Section>

      <Section title="Etiketler">
        <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Etiket ekle…"
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              autoCapitalize="none"
            />
          </View>
          <Button title="Ekle" variant="outline" onPress={addTag} disabled={!tagInput.trim()} />
        </View>
        {form.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] }}>
            {form.tags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => set('tags', form.tags.filter((x) => x !== tag))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: t.spacing[2.5],
                  paddingVertical: t.spacing[1.5],
                  borderRadius: t.radius.full,
                  backgroundColor: t.colors.primarySoft,
                }}
              >
                <Text variant="caption" weight="medium" tone="primary">
                  {tag}
                </Text>
                <Icon name="x" size={12} color={t.colors.primary} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </Section>

      <Section title="Süreli evrak">
        <FormSwitchRow
          label="Süreli evrak mı?"
          description="Son geçerlilik tarihi olan evraklar için (ruhsat, sözleşme, sigorta poliçesi…)"
          value={form.isTimeBound}
          onValueChange={(v) => set('isTimeBound', v)}
        />
        {form.isTimeBound ? (
          <>
            <FormDatePicker label="Düzenleme tarihi" value={form.issueDate} onChange={(v) => set('issueDate', v)} mode="date" />
            <FormDatePicker label="Son geçerlilik tarihi" value={form.expiryDate} onChange={(v) => set('expiryDate', v)} mode="date" />
            <Input
              label="Kaç gün önce hatırlat"
              value={form.reminderDaysBefore}
              onChangeText={(v) => set('reminderDaysBefore', v)}
              keyboardType="number-pad"
              placeholder="30"
            />
          </>
        ) : null}
      </Section>

      <Section title="Gizlilik">
        <FormSwitchRow
          label="Kişiye özel"
          description={
            ownerLocked
              ? 'Bu evrak başka bir kullanıcıya ait — gizlilik durumunu yalnızca sahibi veya yetkili değiştirebilir.'
              : 'Açıksa bu evrak yalnızca size ve yetkili kullanıcılara görünür.'
          }
          value={form.isPrivate}
          onValueChange={(v) => !ownerLocked && set('isPrivate', v)}
        />
      </Section>

      <DynamicAttributeFields
        fields={dynamicFields}
        values={form.attributes}
        onChange={(k, v) => setForm((f) => ({ ...f, attributes: { ...f.attributes, [k]: v } }))}
      />
    </Screen>
  )
}
