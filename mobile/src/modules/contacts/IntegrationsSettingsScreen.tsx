// CRM integrations settings — provider connections (email/Telegram/WhatsApp/SMS/
// AI). One Card per type with its config fields, an "Aktif" switch, plus Kaydet
// (upsert) and Test buttons. Secrets are write-only: their inputs start empty and
// show "•••• (kayıtlı)" as a placeholder when already stored (secretKeys). Mirrors
// the web integrations settings; gated behind ContactsPermissions.integrationsWrite.

import * as React from 'react'
import { Alert, View } from 'react-native'

import {
  AI_PROVIDERS,
  ContactsPermissions,
  INTEGRATION_TYPES,
  type IntegrationConnectionDto,
  type IntegrationType,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  Icon,
  type IconName,
  Input,
  PermissionRequired,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

type FieldDef = {
  key: string
  label: string
  secret?: boolean
  kind?: 'switch'
  placeholder?: string
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'url'
}

const TYPE_META: Record<
  IntegrationType,
  { label: string; icon: IconName; description: string; fields: FieldDef[] }
> = {
  email: {
    label: 'E-posta (SMTP)',
    icon: 'mail',
    description: 'Giden e-posta sunucusu',
    fields: [
      { key: 'host', label: 'Sunucu (host)', placeholder: 'smtp.ornek.com' },
      { key: 'port', label: 'Port', placeholder: '587', keyboardType: 'numeric' },
      { key: 'secure', label: 'SSL/TLS (secure)', kind: 'switch' },
      { key: 'user', label: 'Kullanıcı', placeholder: 'kullanici@ornek.com' },
      { key: 'pass', label: 'Parola', secret: true },
      { key: 'from', label: 'Gönderen (from)', placeholder: 'CRM <crm@ornek.com>' },
    ],
  },
  telegram: {
    label: 'Telegram',
    icon: 'send',
    description: 'Telegram bot bildirimleri',
    fields: [
      { key: 'botToken', label: 'Bot Token', secret: true },
      { key: 'defaultChatId', label: 'Varsayılan Chat ID', placeholder: '123456789' },
    ],
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: 'message-circle',
    description: 'WhatsApp Cloud API',
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '1009...' },
      { key: 'token', label: 'Erişim Token', secret: true },
    ],
  },
  sms: {
    label: 'SMS',
    icon: 'smartphone',
    description: 'SMS sağlayıcı (HTTP)',
    fields: [
      { key: 'url', label: 'API adresi (url)', placeholder: 'https://...', keyboardType: 'url' },
      { key: 'usercode', label: 'Kullanıcı kodu' },
      { key: 'password', label: 'Parola', secret: true },
      { key: 'header', label: 'Başlık (header)', placeholder: 'FIRMA' },
    ],
  },
  ai: {
    label: 'Yapay Zeka',
    icon: 'cpu',
    description: 'AI taslak, özet ve skorlama',
    fields: [],
  },
}

export function IntegrationsSettingsScreen() {
  const nav = useNav()
  const t = useTheme()

  const list = useAsync(() => api.contacts.integrations.list(), [])

  const byType = React.useMemo(() => {
    const map = new Map<IntegrationType, IntegrationConnectionDto>()
    for (const c of list.data ?? []) map.set(c.type, c)
    return map
  }, [list.data])

  return (
    <PermissionRequired
      permission={ContactsPermissions.integrationsWrite}
      title="Entegrasyonlar"
      onBack={nav.goBack}
    >
      <Screen
        header={{ title: 'Entegrasyonlar', subtitle: 'Kanal ve AI bağlantıları', onBack: nav.goBack }}
        onRefresh={list.refetch}
        refreshing={list.refreshing}
      >
        {list.loading ? (
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <Skeleton width="50%" height={18} />
              <Skeleton width="80%" height={13} />
            </View>
          </Card>
        ) : list.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={list.error}
            actionLabel="Tekrar dene"
            onAction={list.refetch}
          />
        ) : (
          INTEGRATION_TYPES.map((type) => (
            <IntegrationCard
              key={type}
              type={type}
              connection={byType.get(type) ?? null}
              onSaved={list.refetch}
            />
          ))
        )}
      </Screen>
    </PermissionRequired>
  )
}

function IntegrationCard({
  type,
  connection,
  onSaved,
}: {
  type: IntegrationType
  connection: IntegrationConnectionDto | null
  onSaved: () => void
}) {
  const t = useTheme()
  const meta = TYPE_META[type]
  const isAi = type === 'ai'
  const { submit, busy } = useSubmit()
  const test = useSubmit()

  const [config, setConfig] = React.useState<Record<string, string>>(() => ({ ...(connection?.config ?? {}) }))
  const [isActive, setIsActive] = React.useState(connection?.isActive ?? false)

  const secretKeys = connection?.secretKeys ?? []

  const setField = (key: string, value: string) =>
    setConfig((prev) => ({ ...prev, [key]: value }))

  // AI: derive the selected provider + model (default to the provider's model).
  const aiProvider =
    AI_PROVIDERS.find((p) => p.value === config.provider) ?? AI_PROVIDERS[0]
  const aiModel = config.model || aiProvider.defaultModel
  const onAiProvider = (value: string) => {
    const info = AI_PROVIDERS.find((p) => p.value === value) ?? AI_PROVIDERS[0]
    setConfig((prev) => ({ ...prev, provider: value, model: info.defaultModel }))
  }

  const save = () => {
    // Build the config to send: keep non-secret fields; only send a secret when
    // the user actually typed one (empty = keep the stored value untouched).
    const out: Record<string, string> = {}
    if (isAi) {
      out.provider = aiProvider.value
      out.model = aiModel
      const base = config.baseUrl
      if (base != null && base.trim()) out.baseUrl = base.trim()
      const key = config.apiKey
      if (aiProvider.needsApiKey && key && key.trim()) out.apiKey = key.trim()
    } else {
      for (const f of meta.fields) {
        const v = config[f.key]
        if (f.secret) {
          if (v && v.trim()) out[f.key] = v.trim()
        } else if (f.kind === 'switch') {
          out[f.key] = config[f.key] === 'true' ? 'true' : 'false'
        } else if (v != null) {
          out[f.key] = v
        }
      }
    }
    submit(
      () => api.contacts.integrations.upsert({ type, isActive, config: out }).then(() => undefined),
      { onSuccess: onSaved, errorTitle: 'Kaydedilemedi' },
    )
  }

  const runTest = () => {
    test.submit(
      async () => {
        const res = await api.contacts.integrations.test(type)
        Alert.alert(res.ok ? 'Bağlantı başarılı' : 'Bağlantı hatası', res.message)
      },
      { errorTitle: 'Test başarısız' },
    )
  }

  return (
    <Section>
      <Card>
        <View style={{ gap: t.spacing[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: t.radius.lg,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.muted,
              }}
            >
              <Icon name={meta.icon} size={20} color={t.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="semibold">
                {meta.label}
              </Text>
              <Text variant="caption" tone="muted">
                {meta.description}
              </Text>
            </View>
            {connection ? (
              <Badge
                label={connection.isActive ? 'Aktif' : 'Pasif'}
                tone={connection.isActive ? 'success' : 'muted'}
              />
            ) : (
              <Badge label="Kurulmadı" tone="muted" />
            )}
          </View>

          <View style={{ gap: t.spacing[3] }}>
            {isAi ? (
              <>
                <FormSelect
                  label="Sağlayıcı"
                  value={aiProvider.value}
                  options={AI_PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
                  onChange={onAiProvider}
                />
                <FormSelect
                  label="Model"
                  value={aiModel}
                  options={aiProvider.models}
                  onChange={(v) => setField('model', v)}
                />
                {aiProvider.needsApiKey ? (
                  <Input
                    label="API Anahtarı"
                    value={config.apiKey ?? ''}
                    onChangeText={(v) => setField('apiKey', v)}
                    password
                    placeholder={secretKeys.includes('apiKey') ? '•••• (kayıtlı)' : undefined}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                ) : null}
                <Input
                  label="Base URL (opsiyonel)"
                  value={config.baseUrl ?? ''}
                  onChangeText={(v) => setField('baseUrl', v)}
                  placeholder={aiProvider.defaultBaseUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            ) : null}
            {meta.fields.map((f) => {
              if (f.kind === 'switch') {
                return (
                  <FormSwitchRow
                    key={f.key}
                    label={f.label}
                    value={config[f.key] === 'true'}
                    onValueChange={(v) => setField(f.key, v ? 'true' : 'false')}
                  />
                )
              }
              const isSet = secretKeys.includes(f.key)
              return (
                <Input
                  key={f.key}
                  label={f.label}
                  value={config[f.key] ?? ''}
                  onChangeText={(v) => setField(f.key, v)}
                  password={f.secret}
                  placeholder={f.secret && isSet ? '•••• (kayıtlı)' : f.placeholder}
                  keyboardType={f.keyboardType ?? 'default'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )
            })}
          </View>

          <FormSwitchRow
            label="Aktif"
            description="Bu kanalı mesaj gönderiminde kullan"
            value={isActive}
            onValueChange={setIsActive}
          />

          <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
            <Button title="Kaydet" icon="save" loading={busy} onPress={save} style={{ flex: 1 }} />
            <Button
              title="Test"
              icon="zap"
              variant="outline"
              loading={test.busy}
              disabled={!connection}
              onPress={runTest}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Card>
    </Section>
  )
}
