// Kartlı geçiş (PDKS) — sekmeli ayar ekranı: Kart Kaynakları, Personel Kartları,
// İçe Aktar (JSON yapıştır) ve Veri Standardı. Mirrors the web card-access-page
// (mobile import is paste-only — no file upload).
import * as React from 'react'
import { View } from 'react-native'
import {
  HrPermissions,
  type AccessEvent,
  type AttendanceImportResultDto,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  DetailTabs,
  EmptyState,
  FormSelect,
  FormTextArea,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  Section,
  SkeletonRows,
  Text,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

type Tab = 'sources' | 'cards' | 'import' | 'standard'

export function CardAccessScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const [tab, setTab] = React.useState<Tab>('sources')

  return (
    <PermissionRequired
      permission={HrPermissions.cardsRead}
      title="Kartlı Geçiş"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{ title: 'Kartlı Geçiş', large: !nav.canGoBack, onBack: nav.canGoBack ? nav.goBack : undefined }}
      >
        <DetailTabs
          tabs={[
            { value: 'sources', label: 'Kaynaklar', icon: 'credit-card' },
            { value: 'cards', label: 'Kartlar', icon: 'user' },
            { value: 'import', label: 'İçe Aktar', icon: 'upload' },
            { value: 'standard', label: 'Standart', icon: 'file-text' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />

        {tab === 'sources' ? (
          <CardSourcesTab hasPermission={hasPermission} nav={nav} />
        ) : tab === 'cards' ? (
          <EmployeeCardsTab hasPermission={hasPermission} nav={nav} />
        ) : tab === 'import' ? (
          <ImportTab hasPermission={hasPermission} />
        ) : (
          <StandardTab />
        )}
      </Screen>
    </PermissionRequired>
  )
}

type HasPerm = (key: string) => boolean
type NavApi = ReturnType<typeof useNav>

// ── Kart Kaynakları ───────────────────────────────────────────────────────────

function CardSourcesTab({ hasPermission, nav }: { hasPermission: HasPerm; nav: NavApi }) {
  const t = useTheme()
  const canWrite = hasPermission(HrPermissions.cardsWrite)
  const sources = useAsync(() => api.hr.cardSources.list(), [])
  const list = sources.data ?? []

  return (
    <View style={{ gap: t.spacing[3], marginTop: t.spacing[3] }}>
      {canWrite ? (
        <Button
          title="Yeni Kaynak"
          icon="plus"
          variant="secondary"
          fullWidth
          onPress={() => nav.navigate('hr.card.entry', {}, 'Yeni kart kaynağı')}
        />
      ) : null}
      {sources.loading ? (
        <SkeletonRows count={3} />
      ) : list.length === 0 ? (
        <EmptyState icon="credit-card" title="Kart kaynağı yok" description="Henüz kart kaynağı tanımlanmamış." />
      ) : (
        <ListCard>
          {list.map((s) => (
            <ListRow
              key={s.id}
              icon="credit-card"
              title={s.name}
              subtitle={`${s.code} · ${s.kind} · ${s.timezone}`}
              trailing={
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {s.hasApiKey ? <Badge label="Anahtar" tone="info" /> : null}
                  <Badge label={s.isActive ? 'Aktif' : 'Pasif'} tone={s.isActive ? 'success' : 'muted'} />
                </View>
              }
              onPress={canWrite ? () => nav.navigate('hr.card.entry', { id: s.id }, s.name) : undefined}
            />
          ))}
        </ListCard>
      )}
    </View>
  )
}

// ── Personel Kartları ─────────────────────────────────────────────────────────

function EmployeeCardsTab({ hasPermission, nav }: { hasPermission: HasPerm; nav: NavApi }) {
  const t = useTheme()
  const canWrite = hasPermission(HrPermissions.cardsWrite)
  const cards = useAsync(() => api.hr.cardSources.listCards(), [])
  const list = cards.data ?? []

  return (
    <View style={{ gap: t.spacing[3], marginTop: t.spacing[3] }}>
      {canWrite ? (
        <Button
          title="Yeni Kart"
          icon="plus"
          variant="secondary"
          fullWidth
          onPress={() => nav.navigate('hr.employeecard.entry', {}, 'Yeni personel kartı')}
        />
      ) : null}
      {cards.loading ? (
        <SkeletonRows count={3} />
      ) : list.length === 0 ? (
        <EmptyState icon="user" title="Personel kartı yok" description="Henüz kart eşlemesi yapılmamış." />
      ) : (
        <ListCard>
          {list.map((c) => (
            <ListRow
              key={c.id}
              icon="user"
              title={c.employeeName}
              subtitle={`Kart ${c.cardNo}${c.externalPersonnelId ? ` · ID ${c.externalPersonnelId}` : ''}`}
              trailing={<Badge label={c.isActive ? 'Aktif' : 'Pasif'} tone={c.isActive ? 'success' : 'muted'} />}
              onPress={canWrite ? () => nav.navigate('hr.employeecard.entry', { id: c.id }, c.employeeName) : undefined}
            />
          ))}
        </ListCard>
      )}
    </View>
  )
}

// ── İçe Aktar ─────────────────────────────────────────────────────────────────

function ImportTab({ hasPermission }: { hasPermission: HasPerm }) {
  const t = useTheme()
  const canImport = hasPermission(HrPermissions.cardsImport)
  const sourcesQuery = useAsync(() => api.hr.cardSources.list(), [])
  const sourceOptions: SelectOption<string>[] = React.useMemo(
    () => (sourcesQuery.data ?? []).map((s) => ({ value: s.code, label: `${s.name} (${s.code})` })),
    [sourcesQuery.data],
  )

  const [source, setSource] = React.useState('')
  const [jsonText, setJsonText] = React.useState('')
  const [result, setResult] = React.useState<AttendanceImportResultDto | null>(null)
  const { submit, busy } = useSubmit()

  const run = () => {
    if (!source) {
      alert('Kart kaynağı seçin')
      return
    }
    let events: AccessEvent[]
    try {
      const parsed = JSON.parse(jsonText)
      events = Array.isArray(parsed) ? parsed : parsed.events
      if (!Array.isArray(events)) throw new Error('events dizisi bulunamadı')
    } catch (e) {
      alert(`JSON ayrıştırılamadı: ${e instanceof Error ? e.message : String(e)}`)
      return
    }
    submit(
      async () => {
        const res = await api.hr.attendance.import({ source, events })
        setResult(res)
      },
      { errorTitle: 'İçe aktarma başarısız' },
    )
  }

  return (
    <View style={{ gap: t.spacing[4], marginTop: t.spacing[3] }}>
      <Card>
        <View style={{ gap: t.spacing[4] }}>
          <FormSelect label="Kaynak" value={source} options={sourceOptions} onChange={setSource} />
          <FormTextArea
            label="JSON (AccessEvent[] veya { events: [...] })"
            value={jsonText}
            onChangeText={setJsonText}
            rows={8}
            placeholder={'{ "events": [ { "deviceId": "T1", "cardNo": "0012345", "direction": "in", "eventTime": "2026-06-30T08:03:12+03:00" } ] }'}
          />
          <Button
            title="İçe aktar"
            icon="upload"
            fullWidth
            loading={busy}
            onPress={run}
            disabled={!canImport || !source || !jsonText.trim()}
          />
          {!canImport ? (
            <Text variant="caption" tone="muted">
              İçe aktarma için yetkiniz yok.
            </Text>
          ) : null}
        </View>
      </Card>

      {result ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] }}>
              <Badge label={`Alınan ${result.received}`} tone="muted" />
              <Badge label={`Eklenen ${result.inserted}`} tone="success" />
              <Badge label={`Tekrar ${result.duplicates}`} tone="muted" />
              <Badge label={`Eşleşmeyen ${result.unmatched}`} tone="warning" />
              <Badge label={`Reddedilen ${result.rejected}`} tone="destructive" />
            </View>
            {result.errors.length > 0 ? (
              <View style={{ gap: 4 }}>
                {result.errors.slice(0, 10).map((er, i) => (
                  <Text key={i} variant="caption" tone="destructive">
                    #{er.index} {er.externalId ? `(${er.externalId})` : ''}: {er.reason}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}
    </View>
  )
}

// ── Veri Standardı ────────────────────────────────────────────────────────────

function StandardTab() {
  const t = useTheme()
  return (
    <Section title="Kartlı Geçiş Veri Standardı">
      <Card>
        <View style={{ gap: t.spacing[3] }}>
          <Text variant="caption" tone="muted">
            Vendor-bağımsız AccessEvent standardı. Toplu içe aktarma gövdesi:
          </Text>
          <View style={{ backgroundColor: t.colors.muted, borderRadius: t.radius.md, padding: t.spacing[3] }}>
            <Text variant="caption" style={{ fontFamily: 'monospace' }}>
              {'{ "source":"<kaynak kodu>", "deviceId":"<terminal>", "events":[ AccessEvent... ] }'}
            </Text>
          </View>
          <Text variant="caption" tone="muted">
            <Text variant="caption" weight="semibold">
              AccessEvent alanları:
            </Text>{' '}
            externalId? (idempotency anahtarı; yoksa türetilir), cardNo? (string — baştaki sıfırlar korunur),
            personnelId?, deviceId (zorunlu), direction (in|out|unknown), eventTime (ISO 8601, offsetli:
            2026-06-30T08:03:12+03:00, zorunlu), eventType? (attendance|access_granted|access_denied|door).
          </Text>
          <Text variant="caption" tone="muted">
            <Text variant="caption" weight="semibold">
              Eşleme sırası:
            </Text>{' '}
            employeeRef → employee.cardNo → personel kartı (cardNo) → externalPersonnelId. Eşleşmeyen kayıtlar
            "flagged" olarak girer.
          </Text>
          <Text variant="caption" tone="muted">
            Detay: docs/hr-pdks.md
          </Text>
        </View>
      </Card>
    </Section>
  )
}
