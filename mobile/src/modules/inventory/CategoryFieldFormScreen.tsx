// CategoryFieldFormScreen — add or edit ONE custom field definition on a category.
// Params: { id: categoryId, fieldKey?: existing def to edit }. Saves by PATCHing
// the category's fieldDefs jsonb. Gated by inventory.categories.write.

import * as React from 'react'

import {
  CATEGORY_FIELD_TYPES,
  type CategoryFieldDef,
  type CategoryFieldType,
  InventoryPermissions,
} from '@turbohesap/shared'

import {
  Button,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  FormTextArea,
  Input,
  Screen,
  Section,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { FIELD_TYPE_LABELS } from './labels'

interface FormState {
  key: string
  label: string
  type: CategoryFieldType
  required: boolean
  options: string // one per line
  lookupList: string
  min: string
  max: string
  step: string
  unit: string
  currency: string
  minDate: string
  maxDate: string
  helpText: string
}

const EMPTY: FormState = {
  key: '', label: '', type: 'text', required: false, options: '', lookupList: '',
  min: '', max: '', step: '', unit: '', currency: '', minDate: '', maxDate: '', helpText: '',
}

function slug(label: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i' }
  return label.toLowerCase().split('').map((c) => map[c] ?? c).join('').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48)
}

export function CategoryFieldFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const categoryId = String(nav.current.params?.id ?? '')
  const fieldKey = nav.current.params?.fieldKey ? String(nav.current.params.fieldKey) : null
  const editing = !!fieldKey
  const { submit, busy } = useSubmit()

  const category = useAsync(() => api.inventory.categories.get(categoryId), [categoryId], {
    enabled: !!categoryId,
  })
  // Existing lookup list names, for the combobox when type === 'lookup'.
  const lists = useAsync(() => api.lookups.lists(), [])

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [keyEdited, setKeyEdited] = React.useState(false)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (!category.data || !fieldKey) return
    const d = category.data.fieldDefs.find((f) => f.key === fieldKey)
    if (!d) return
    setForm({
      key: d.key, label: d.label, type: d.type, required: d.required,
      options: (d.options ?? []).join('\n'), lookupList: d.lookupList ?? '',
      min: d.min?.toString() ?? '', max: d.max?.toString() ?? '', step: d.step?.toString() ?? '',
      unit: d.unit ?? '', currency: d.currency ?? '', minDate: (d.minDate ?? '').slice(0, 10),
      maxDate: (d.maxDate ?? '').slice(0, 10), helpText: d.helpText ?? '',
    })
    setKeyEdited(true)
  }, [category.data, fieldKey])

  if (!hasPermission(InventoryPermissions.categoriesWrite)) {
    return (
      <Screen header={{ title: 'Alan', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem için izniniz yok." />
      </Screen>
    )
  }

  function save() {
    const cat = category.data
    if (!cat) return
    const num = (s: string) => (s.trim() === '' ? undefined : Number(s))
    const isOpt = form.type === 'select' || form.type === 'multiselect'
    const isNum = form.type === 'number' || form.type === 'money'
    const isDate = form.type === 'date' || form.type === 'daterange'
    const def: CategoryFieldDef = {
      key: (form.key.trim() || slug(form.label)).trim(),
      label: form.label.trim(),
      type: form.type,
      required: form.required,
      ...(isOpt ? { options: form.options.split('\n').map((s) => s.trim()).filter(Boolean) } : {}),
      ...(form.type === 'lookup' ? { lookupList: form.lookupList.trim() } : {}),
      ...(isNum ? { min: num(form.min), max: num(form.max), step: num(form.step) } : {}),
      ...(form.type === 'number' ? { unit: form.unit.trim() || undefined } : {}),
      ...(form.type === 'money' ? { currency: form.currency.trim() || undefined } : {}),
      ...(isDate ? { minDate: form.minDate.trim() || undefined, maxDate: form.maxDate.trim() || undefined } : {}),
      ...(form.helpText.trim() ? { helpText: form.helpText.trim() } : {}),
    }
    const others = cat.fieldDefs.filter((f) => f.key !== (fieldKey ?? def.key))
    // Prevent duplicate keys.
    if (others.some((f) => f.key === def.key)) {
      // append a suffix to keep it valid
      def.key = `${def.key}_2`
    }
    const nextDefs = editing
      ? cat.fieldDefs.map((f) => (f.key === fieldKey ? def : f))
      : [...cat.fieldDefs, def]

    void submit(
      () => api.inventory.categories.update(categoryId, { fieldDefs: nextDefs }).then(() => undefined),
      { onSuccess: nav.goBack },
    )
  }

  const isOpt = form.type === 'select' || form.type === 'multiselect'
  const isNum = form.type === 'number' || form.type === 'money'
  const isDate = form.type === 'date' || form.type === 'daterange'
  const canSave = form.label.trim() !== ''

  return (
    <Screen
      header={{ title: editing ? 'Alanı düzenle' : 'Yeni alan', onBack: nav.goBack }}
      footer={<Button title={editing ? 'Kaydet' : 'Ekle'} fullWidth loading={busy} disabled={!canSave} onPress={save} />}
    >
      <Section title="Alan">
        <Input
          label="Alan adı"
          value={form.label}
          onChangeText={(v) => {
            setForm((f) => ({ ...f, label: v, ...(keyEdited ? {} : { key: slug(v) }) }))
          }}
          placeholder="örn. Beden"
        />
        <Input
          label="Anahtar"
          value={form.key}
          editable={!editing}
          autoCapitalize="none"
          onChangeText={(v) => { setKeyEdited(true); set('key', v) }}
          placeholder="otomatik"
        />
        <FormSelect
          label="Tür"
          value={form.type}
          onChange={(v) => set('type', v)}
          options={CATEGORY_FIELD_TYPES.map((tp) => ({ value: tp, label: FIELD_TYPE_LABELS[tp] }))}
        />
        <FormSwitchRow label="Zorunlu" value={form.required} onValueChange={(v) => set('required', v)} />
      </Section>

      {isOpt ? (
        <Section title="Seçenekler">
          <FormTextArea label="Her satır bir değer" value={form.options} onChangeText={(v) => set('options', v)} rows={4} placeholder={'Kırmızı\nMavi\nYeşil'} />
        </Section>
      ) : null}

      {form.type === 'lookup' ? (
        <Section title="Tanım listesi">
          <FormSelect
            label="Liste"
            value={form.lookupList}
            onChange={(v) => set('lookupList', v)}
            options={[
              ...(form.lookupList && !(lists.data ?? []).some((l) => l.list === form.lookupList)
                ? [{ value: form.lookupList, label: form.lookupList }]
                : []),
              ...(lists.data ?? []).map((l) => ({ value: l.list, label: `${l.list} (${l.count})` })),
            ]}
          />
          <Text variant="caption" tone="muted">
            Ürün formunda bu tanım listesinden seçtirilir. Yeni liste için “Tanımlar” modülünü kullanın.
          </Text>
        </Section>
      ) : null}

      {isNum ? (
        <Section title="Sayısal sınırlar">
          <Input label="Min" value={form.min} onChangeText={(v) => set('min', v)} keyboardType="decimal-pad" />
          <Input label="Max" value={form.max} onChangeText={(v) => set('max', v)} keyboardType="decimal-pad" />
          <Input label="Adım" value={form.step} onChangeText={(v) => set('step', v)} keyboardType="decimal-pad" />
          {form.type === 'money' ? (
            <Input label="Para birimi" value={form.currency} onChangeText={(v) => set('currency', v)} placeholder="TRY" />
          ) : (
            <Input label="Birim" value={form.unit} onChangeText={(v) => set('unit', v)} placeholder="gr" />
          )}
        </Section>
      ) : null}

      {isDate ? (
        <Section title="Tarih sınırları">
          <Input label="En erken (YYYY-AA-GG)" value={form.minDate} onChangeText={(v) => set('minDate', v)} autoCapitalize="none" />
          <Input label="En geç (YYYY-AA-GG)" value={form.maxDate} onChangeText={(v) => set('maxDate', v)} autoCapitalize="none" />
        </Section>
      ) : null}

      <Section title="Diğer">
        <Input label="Yardım metni" value={form.helpText} onChangeText={(v) => set('helpText', v)} placeholder="Kullanıcıya ipucu" />
      </Section>
    </Screen>
  )
}
