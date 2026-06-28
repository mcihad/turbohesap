// Entegrasyon ayarları — her kanal (E-posta/Telegram/WhatsApp/SMS/AI) için bir
// sekme; her sekme o kanalın yapılandırma formunu, Aktif anahtarını, Kaydet
// (upsert) ve Test butonlarını içerir. Gizli alanlar yazma amaçlıdır: kayıtlıysa
// "•••• (kayıtlı)" placeholder ile boş gösterilir, yalnızca yeni bir değer
// girilirse gönderilir. AI sekmesi çoklu sağlayıcı (AI_PROVIDERS) destekler.
// integrationsWrite ile korunur.

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Mail, MessageCircle, MessageSquare, Save, Send, Sparkles, TestTube } from 'lucide-react'
import { toast } from 'sonner'

import {
  AI_PROVIDERS,
  ContactsPermissions,
  INTEGRATION_TYPES,
  toApiError,
  type AiProvider,
  type IntegrationConnectionDto,
  type IntegrationType,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type GenericType = Exclude<IntegrationType, 'ai'>
type FieldKind = 'text' | 'password' | 'boolean'
interface FieldDef {
  key: string
  label: string
  kind?: FieldKind
  placeholder?: string
  optional?: boolean
}

// Generic key/value fields per channel. AI is special-cased (provider plugin).
const FIELDS: Record<GenericType, FieldDef[]> = {
  email: [
    { key: 'host', label: 'Sunucu (host)', placeholder: 'smtp.example.com' },
    { key: 'port', label: 'Port', placeholder: '587' },
    { key: 'secure', label: 'Güvenli (SSL/TLS)', kind: 'boolean' },
    { key: 'user', label: 'Kullanıcı' },
    { key: 'pass', label: 'Parola', kind: 'password' },
    { key: 'from', label: 'Gönderen', placeholder: 'ad@example.com' },
  ],
  telegram: [
    { key: 'botToken', label: 'Bot Token', kind: 'password' },
    { key: 'defaultChatId', label: 'Varsayılan Chat ID' },
  ],
  whatsapp: [
    { key: 'phoneNumberId', label: 'Phone Number ID' },
    { key: 'token', label: 'Token', kind: 'password' },
  ],
  sms: [
    { key: 'url', label: 'URL', optional: true },
    { key: 'usercode', label: 'Kullanıcı kodu' },
    { key: 'password', label: 'Parola', kind: 'password' },
    { key: 'header', label: 'Başlık (header)' },
  ],
}

const TYPE_META: Record<IntegrationType, { label: string; description: string; icon: typeof Mail }> = {
  email: { label: 'E-posta', description: 'SMTP üzerinden e-posta gönderimi', icon: Mail },
  telegram: { label: 'Telegram', description: 'Telegram bot ile mesaj gönderimi', icon: Send },
  whatsapp: { label: 'WhatsApp', description: 'WhatsApp Cloud API', icon: MessageCircle },
  sms: { label: 'SMS', description: 'SMS sağlayıcı entegrasyonu', icon: MessageSquare },
  ai: { label: 'AI', description: 'Yapay zekâ ile taslak, özet ve skorlama', icon: Sparkles },
}

export function IntegrationsSettingsPage() {
  const listQuery = useQuery({
    queryKey: ['contacts', 'integrations'],
    queryFn: () => api.contacts.integrations.list(),
  })

  const byType = React.useMemo(() => {
    const map = new Map<IntegrationType, IntegrationConnectionDto>()
    for (const c of listQuery.data ?? []) map.set(c.type, c)
    return map
  }, [listQuery.data])

  return (
    <PermissionRequired permission={ContactsPermissions.integrationsWrite}>
      <PageWrapper>
        <PageHeader
          title="Entegrasyonlar"
          description="Mesajlaşma kanalları ve yapay zekâ bağlantılarını yapılandırın."
        />

        {listQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full max-w-md rounded-md" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        ) : (
          <Tabs defaultValue={INTEGRATION_TYPES[0]}>
            <TabsList>
              {INTEGRATION_TYPES.map((type) => {
                const meta = TYPE_META[type]
                const Icon = meta.icon
                return (
                  <TabsTrigger key={type} value={type}>
                    <Icon className="size-4" />
                    {meta.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {INTEGRATION_TYPES.map((type) => (
              <TabsContent key={type} value={type}>
                {type === 'ai' ? (
                  <AiIntegrationForm connection={byType.get('ai') ?? null} />
                ) : (
                  <IntegrationForm type={type} connection={byType.get(type) ?? null} />
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

// ── Shared form chrome ──────────────────────────────────────────────────────

function FormHeader({
  type,
  isActive,
  setIsActive,
}: {
  type: IntegrationType
  isActive: boolean
  setIsActive: (v: boolean) => void
}) {
  const meta = TYPE_META[type]
  const Icon = meta.icon
  return (
    <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="space-y-0.5">
          <CardTitle className="text-sm">{meta.label}</CardTitle>
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        </div>
      </div>
      <label className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Aktif</span>
        <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Aktif" />
      </label>
    </CardHeader>
  )
}

function FormActions({
  onTest,
  onSave,
  testPending,
  savePending,
  canTest,
}: {
  onTest: () => void
  onSave: () => void
  testPending: boolean
  savePending: boolean
  canTest: boolean
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-1">
      <Button variant="outline" size="sm" onClick={onTest} disabled={testPending || !canTest}>
        {testPending ? <Loader2 className="animate-spin" /> : <TestTube />}
        Test
      </Button>
      <Button size="sm" onClick={onSave} disabled={savePending}>
        {savePending ? <Loader2 className="animate-spin" /> : <Save />}
        Kaydet
      </Button>
    </div>
  )
}

// Shared save/test wiring for a single integration connection.
function useIntegrationMutations(type: IntegrationType) {
  const qc = useQueryClient()
  const meta = TYPE_META[type]

  const save = useMutation({
    mutationFn: (vars: { name: string; isActive: boolean; config: Record<string, string> }) =>
      api.contacts.integrations.upsert({
        type,
        name: vars.name.trim() || meta.label,
        isActive: vars.isActive,
        config: vars.config,
      }),
    onSuccess: () => {
      toast.success(`${meta.label} kaydedildi`)
      void qc.invalidateQueries({ queryKey: ['contacts', 'integrations'] })
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const test = useMutation({
    mutationFn: () => api.contacts.integrations.test(type),
    onSuccess: (res) => {
      if (res.ok) toast.success('Test başarılı', { description: res.message })
      else toast.error('Test başarısız', { description: res.message })
    },
    onError: (e) => toast.error('Test edilemedi', { description: toApiError(e).message }),
  })

  return { save, test }
}

// ── Generic channel form (email / telegram / whatsapp / sms) ─────────────────

function initValues(type: GenericType, connection: IntegrationConnectionDto | null): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of FIELDS[type]) {
    if (f.kind === 'password') {
      out[f.key] = '' // secrets are write-only; never prefill the mask
    } else if (f.kind === 'boolean') {
      out[f.key] = connection?.config[f.key] === 'true' ? 'true' : 'false'
    } else {
      out[f.key] = connection?.config[f.key] ?? ''
    }
  }
  return out
}

function IntegrationForm({
  type,
  connection,
}: {
  type: GenericType
  connection: IntegrationConnectionDto | null
}) {
  const meta = TYPE_META[type]
  const { save, test } = useIntegrationMutations(type)

  const [name, setName] = React.useState(connection?.name ?? meta.label)
  const [isActive, setIsActive] = React.useState(connection?.isActive ?? false)
  const [values, setValues] = React.useState<Record<string, string>>(() => initValues(type, connection))

  // Re-sync local state when the server value changes (e.g. after refetch).
  React.useEffect(() => {
    setName(connection?.name ?? meta.label)
    setIsActive(connection?.isActive ?? false)
    setValues(initValues(type, connection))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection])

  const setField = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }))

  const buildConfig = (): Record<string, string> => {
    const config: Record<string, string> = {}
    for (const f of FIELDS[type]) {
      const v = values[f.key] ?? ''
      if (f.kind === 'password') {
        if (v.trim()) config[f.key] = v.trim() // only overwrite secret when newly typed
      } else {
        config[f.key] = v
      }
    }
    return config
  }

  return (
    <Card>
      <FormHeader type={type} isActive={isActive} setIsActive={setIsActive} />
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Bağlantı adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={meta.label} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS[type].map((f) => {
            const isSecretSet = f.kind === 'password' && (connection?.secretKeys.includes(f.key) ?? false)
            return (
              <div key={f.key} className="space-y-1.5">
                <Label>
                  {f.label}
                  {f.optional ? <span className="ml-1 text-muted-foreground">(opsiyonel)</span> : null}
                </Label>
                {f.kind === 'boolean' ? (
                  <Select value={values[f.key]} onValueChange={(v) => setField(f.key, v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Evet</SelectItem>
                      <SelectItem value="false">Hayır</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.kind === 'password' ? 'password' : 'text'}
                    value={values[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={isSecretSet ? '•••• (kayıtlı)' : f.placeholder}
                    autoComplete={f.kind === 'password' ? 'new-password' : undefined}
                  />
                )}
              </div>
            )
          })}
        </div>

        {type === 'telegram' ? (
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Her kullanıcının kişisel Telegram Chat ID'si, Kullanıcılar bölümünde kullanıcı
            eklerken veya kullanıcı detayında tanımlanır.
          </p>
        ) : null}

        <FormActions
          onTest={() => test.mutate()}
          onSave={() => save.mutate({ name, isActive, config: buildConfig() })}
          testPending={test.isPending}
          savePending={save.isPending}
          canTest={!!connection}
        />
      </CardContent>
    </Card>
  )
}

// ── AI form (pluggable providers via AI_PROVIDERS) ───────────────────────────

function AiIntegrationForm({ connection }: { connection: IntegrationConnectionDto | null }) {
  const meta = TYPE_META.ai
  const { save, test } = useIntegrationMutations('ai')

  const initProvider = (): AiProvider => {
    const fromConfig = connection?.config.provider as AiProvider | undefined
    if (fromConfig && AI_PROVIDERS.some((p) => p.value === fromConfig)) return fromConfig
    return AI_PROVIDERS[0].value
  }

  const [name, setName] = React.useState(connection?.name ?? meta.label)
  const [isActive, setIsActive] = React.useState(connection?.isActive ?? false)
  const [provider, setProvider] = React.useState<AiProvider>(() => initProvider())
  const [model, setModel] = React.useState(connection?.config.model ?? '')
  const [baseUrl, setBaseUrl] = React.useState(connection?.config.baseUrl ?? '')
  const [apiKey, setApiKey] = React.useState('') // write-only secret

  const info = React.useMemo(
    () => AI_PROVIDERS.find((p) => p.value === provider) ?? AI_PROVIDERS[0],
    [provider],
  )

  // Re-sync from server on refetch.
  React.useEffect(() => {
    setName(connection?.name ?? meta.label)
    setIsActive(connection?.isActive ?? false)
    setProvider(initProvider())
    setModel(connection?.config.model ?? '')
    setBaseUrl(connection?.config.baseUrl ?? '')
    setApiKey('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection])

  // When switching provider, fall back to that provider's default model if the
  // current model is not part of its catalogue.
  const onProviderChange = (next: AiProvider) => {
    setProvider(next)
    const nextInfo = AI_PROVIDERS.find((p) => p.value === next)
    if (nextInfo && !nextInfo.models.some((m) => m.value === model)) {
      setModel(nextInfo.defaultModel)
    }
  }

  const apiKeySet = connection?.secretKeys.includes('apiKey') ?? false

  const buildConfig = (): Record<string, string> => {
    const config: Record<string, string> = {
      provider,
      model: model.trim() || info.defaultModel,
      baseUrl: baseUrl.trim(),
    }
    if (info.needsApiKey && apiKey.trim()) config.apiKey = apiKey.trim()
    return config
  }

  return (
    <Card>
      <FormHeader type="ai" isActive={isActive} setIsActive={setIsActive} />
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Bağlantı adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={meta.label} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Sağlayıcı</Label>
            <Select value={provider} onValueChange={(v) => onProviderChange(v as AiProvider)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Model</Label>
            <Select value={model || info.defaultModel} onValueChange={setModel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {info.models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {info.needsApiKey ? (
            <div className="space-y-1.5">
              <Label>API Anahtarı</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiKeySet ? '•••• (kayıtlı)' : undefined}
                autoComplete="new-password"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>
              Base URL
              <span className="ml-1 text-muted-foreground">(opsiyonel)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={info.defaultBaseUrl}
            />
          </div>
        </div>

        <FormActions
          onTest={() => test.mutate()}
          onSave={() => save.mutate({ name, isActive, config: buildConfig() })}
          testPending={test.isPending}
          savePending={save.isPending}
          canTest={!!connection}
        />
      </CardContent>
    </Card>
  )
}
