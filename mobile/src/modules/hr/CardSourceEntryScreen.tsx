// Kart kaynağı oluştur/düzenle — terminal/sistem ayarları ve API anahtarı.
// Mirrors the web card-source dialog. The API key is write-only: it is never
// returned, so an empty field keeps the stored one.
import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  HrPermissions,
  type AccessDirection,
  type CreateCardSourceRequest,
} from '@turbohesap/shared'
import {
  Button,
  Card,
  EmptyState,
  FormSwitchRow,
  FormTextArea,
  Input,
  Screen,
  Section,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

export function CardSourceEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(HrPermissions.cardsWrite)

  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.hr.cardSources.get(id as string), [id], { enabled: editing })

  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [kind, setKind] = React.useState('generic')
  const [timezone, setTimezone] = React.useState('Europe/Istanbul')
  const [description, setDescription] = React.useState('')
  const [directionMapping, setDirectionMapping] = React.useState('{}')
  const [apiKey, setApiKey] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)
  const hasApiKey = existing.data?.hasApiKey ?? false

  React.useEffect(() => {
    const d = existing.data
    if (!d) return
    setName(d.name)
    setCode(d.code)
    setKind(d.kind)
    setTimezone(d.timezone)
    setDescription(d.description ?? '')
    setDirectionMapping(JSON.stringify(d.directionMapping ?? {}, null, 2))
    setApiKey('')
    setIsActive(d.isActive)
  }, [existing.data])

  const save = () => {
    if (!name.trim()) {
      alert('Ad zorunludur')
      return
    }
    let mapping: Record<string, AccessDirection> = {}
    const raw = directionMapping.trim()
    if (raw) {
      try {
        mapping = JSON.parse(raw)
      } catch {
        alert('Yön eşlemesi geçerli JSON değil.')
        return
      }
    }
    submit(async () => {
      const payload: CreateCardSourceRequest = {
        name: name.trim(),
        code: code.trim() || undefined,
        kind: kind.trim() || 'generic',
        timezone: timezone.trim() || 'Europe/Istanbul',
        description: description.trim() || null,
        directionMapping: mapping,
        isActive,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      }
      if (editing) await api.hr.cardSources.update(id as string, payload)
      else await api.hr.cardSources.create(payload)
      nav.goBack()
    })
  }

  const remove = () =>
    confirmDestructive('Kaynak sil', `"${name}" kaynağı silinsin mi?`, () =>
      submit(async () => {
        await api.hr.cardSources.remove(id as string)
        nav.goBack()
      }),
    )

  if (!canWrite) {
    return (
      <Screen header={{ title: editing ? 'Kaynak düzenle' : 'Yeni kaynak', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  const loadingExisting = editing && existing.loading

  return (
    <Screen
      header={{ title: editing ? 'Kart kaynağını düzenle' : 'Yeni kart kaynağı', onBack: nav.goBack }}
      footer={
        !loadingExisting ? (
          <Button title={editing ? 'Kaydet' : 'Oluştur'} icon="check" fullWidth loading={busy} onPress={save} />
        ) : undefined
      }
    >
      {loadingExisting ? (
        <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <Section title="Tanım">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1.6 }}>
                    <Input label="Ad" value={name} onChangeText={setName} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Kod" autoCapitalize="characters" value={code} onChangeText={setCode} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Tür (kind)" autoCapitalize="none" placeholder="generic" value={kind} onChangeText={setKind} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Saat dilimi" autoCapitalize="none" value={timezone} onChangeText={setTimezone} />
                  </View>
                </View>
                <FormTextArea label="Açıklama" value={description} onChangeText={setDescription} rows={2} />
                <FormSwitchRow label="Aktif" value={isActive} onValueChange={setIsActive} />
              </View>
            </Card>
          </Section>

          <Section title="Yön eşlemesi (JSON)">
            <FormTextArea
              value={directionMapping}
              onChangeText={setDirectionMapping}
              rows={3}
              placeholder={'{ "0": "in", "1": "out" }'}
            />
          </Section>

          <Section title="API Anahtarı">
            <Card>
              <Input
                label="API Anahtarı"
                password
                autoCapitalize="none"
                value={apiKey}
                onChangeText={setApiKey}
                placeholder={hasApiKey ? '•••• (kayıtlı)' : 'Anahtar girin'}
              />
            </Card>
          </Section>

          {editing ? (
            <Section title="Tehlikeli bölge">
              <Button title="Kaynağı sil" icon="trash-2" variant="destructive" fullWidth loading={busy} onPress={remove} />
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  )
}
