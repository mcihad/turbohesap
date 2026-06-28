// PipelineStageFormScreen — bir satış aşamasının (stage) tam düzenlemesi: ad,
// olasılık (%), tür (açık/kazanıldı/kaybedildi), renk ve çürüme günü. Params:
// { pipelineId, stageId }. updateStage ile kaydeder. pipelinesWrite ile korunur.

import * as React from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'
import {
  ContactsPermissions,
  STAGE_TYPES,
  type StageType,
  type UpdatePipelineStageRequest,
} from '@turbohesap/shared'

import {
  Button,
  EmptyState,
  FormSelect,
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
import { useTheme } from '../../theme/theme-context'

const STAGE_TYPE_LABEL: Record<StageType, string> = {
  open: 'Açık',
  won: 'Kazanıldı',
  lost: 'Kaybedildi',
}

const STAGE_TYPE_OPTIONS = STAGE_TYPES.map((s) => ({ value: s, label: STAGE_TYPE_LABEL[s] }))

// Common preset colours for quick selection (mirrors the web colour picker intent).
const PRESET_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']

interface FormState {
  name: string
  probability: string
  type: StageType
  color: string
  rottingDays: string
}

const EMPTY: FormState = { name: '', probability: '0', type: 'open', color: '#6366f1', rottingDays: '0' }

export function PipelineStageFormScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const pipelineId = String(nav.current.params?.pipelineId ?? '')
  const stageId = String(nav.current.params?.stageId ?? '')
  const { submit, busy } = useSubmit()

  const pipeline = useAsync(() => api.contacts.pipelines.get(pipelineId), [pipelineId], {
    enabled: !!pipelineId,
  })

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    const stage = pipeline.data?.stages.find((s) => s.id === stageId)
    if (!stage) return
    setForm({
      name: stage.name,
      probability: String(stage.probability),
      type: stage.type,
      color: stage.color,
      rottingDays: String(stage.rottingDays),
    })
  }, [pipeline.data, stageId])

  if (!hasPermission(ContactsPermissions.pipelinesWrite)) {
    return (
      <Screen header={{ title: 'Aşama', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem için izniniz yok." />
      </Screen>
    )
  }

  const save = () => {
    if (!form.name.trim()) {
      alert('Aşama adı girilmelidir')
      return
    }
    const input: UpdatePipelineStageRequest = {
      name: form.name.trim(),
      probability: Number(form.probability) || 0,
      type: form.type,
      color: form.color.trim() || '#6366f1',
      rottingDays: Number(form.rottingDays) || 0,
    }
    submit(
      () => api.contacts.pipelines.updateStage(pipelineId, stageId, input).then(() => undefined),
      { onSuccess: nav.goBack },
    )
  }

  const loading = pipeline.loading

  return (
    <Screen
      header={{ title: 'Aşamayı düzenle', onBack: nav.goBack }}
      footer={
        !loading ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button title="Vazgeç" variant="outline" fullWidth onPress={nav.goBack} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Kaydet" fullWidth loading={busy} onPress={save} />
            </View>
          </View>
        ) : undefined
      }
    >
      {loading ? (
        <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <Section title="Aşama">
            <Input label="Ad" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Örn: Teklif" />
            <FormSelect
              label="Tür"
              value={form.type}
              onChange={(v) => set('type', v)}
              options={STAGE_TYPE_OPTIONS}
            />
            <Input
              label="Kazanma Olasılığı (%)"
              keyboardType="numeric"
              value={form.probability}
              onChangeText={(v) => set('probability', v)}
              placeholder="0-100"
            />
            <Input
              label="Çürüme (gün)"
              keyboardType="numeric"
              value={form.rottingDays}
              onChangeText={(v) => set('rottingDays', v)}
              placeholder="0 = kapalı"
            />
          </Section>

          <Section title="Renk">
            <Input label="Renk (hex)" autoCapitalize="none" value={form.color} onChangeText={(v) => set('color', v)} placeholder="#6366f1" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] }}>
              {PRESET_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => set('color', c)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: c,
                    borderWidth: form.color.toLowerCase() === c ? 3 : 1,
                    borderColor: form.color.toLowerCase() === c ? t.colors.foreground : t.colors.border,
                  }}
                />
              ))}
            </View>
            <Text variant="caption" tone="muted">
              Bu aşamadaki fırsatlar panoda bu renkle gösterilir.
            </Text>
          </Section>
        </>
      )}
    </Screen>
  )
}
