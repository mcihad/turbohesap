// CRM satış kontrol paneli — pipeline seçici + "Benim İşlerim" filtresi, üst metrik
// kartları, aşamaya göre değer çubukları, kayıp nedenleri ve etkinlik liderlik
// tablosu. Verileri api.contacts.crm.dashboard'tan toplar.

import * as React from 'react'
import { View } from 'react-native'
import { ContactsPermissions } from '@turbohesap/shared'
import {
  ChartCard,
  EmptyState,
  FormSelect,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  Skeleton,
  StatCard,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './format'

const ALL_PIPELINES = '__all__'

export function CrmDashboardScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.opportunitiesRead)
  const canReadPipelines = hasPermission(ContactsPermissions.pipelinesRead)

  const [pipelineId, setPipelineId] = React.useState<string>(ALL_PIPELINES)
  const [mine, setMine] = React.useState(false)

  const pipelines = useAsync(() => api.contacts.pipelines.list(), [], { enabled: canReadPipelines })
  const dashboard = useAsync(
    () =>
      api.contacts.crm.dashboard({
        pipelineId: pipelineId === ALL_PIPELINES ? undefined : pipelineId,
        mine: mine || undefined,
      }),
    [pipelineId, mine],
    { enabled: canRead },
  )

  const data = dashboard.data
  const byStage = data?.byStage ?? []
  const lossReasons = data?.lossReasons ?? []
  const leaderboard = data?.activityLeaderboard ?? []
  const maxStageValue = Math.max(1, ...byStage.map((b) => b.value))

  const pipelineOptions = [
    { value: ALL_PIPELINES, label: "Tüm satış hatları" },
    ...(pipelines.data ?? []).map((p) => ({ value: p.id, label: p.name })),
  ]

  return (
    <PermissionRequired permission={ContactsPermissions.opportunitiesRead} title="Satış Paneli" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Satış Paneli',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
        }}
        onRefresh={dashboard.refetch}
        refreshing={dashboard.refreshing}
      >
        <FormSelect label="Satış Hattı" value={pipelineId} onChange={setPipelineId} options={pipelineOptions} />
        <FormSelect
          label="Kapsam"
          value={mine ? 'mine' : 'all'}
          onChange={(v) => setMine(v === 'mine')}
          options={[
            { value: 'all', label: 'Tüm fırsatlar' },
            { value: 'mine', label: 'Benim İşlerim' },
          ]}
        />

        {dashboard.loading ? (
          <Skeleton width="100%" height={220} />
        ) : dashboard.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={dashboard.error} actionLabel="Tekrar dene" onAction={dashboard.refetch} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
              <Cell>
                <StatCard icon="target" tone="primary" label="Açık Fırsat" value={String(data?.openCount ?? 0)} />
              </Cell>
              <Cell>
                <StatCard icon="trending-up" tone="info" label="Ağırlıklı Tahmin" value={formatMoney(data?.weightedForecast ?? 0)} />
              </Cell>
              <Cell>
                <StatCard icon="award" tone="success" label="Kazanma Oranı" value={`%${Math.round(data?.winRate ?? 0)}`} />
              </Cell>
              <Cell>
                <StatCard icon="clock" tone="warning" label="Ort. Döngü" value={`${Math.round(data?.avgSalesCycleDays ?? 0)} gün`} />
              </Cell>
            </View>

            <ChartCard title="Aşamaya göre değer" subtitle="Pipeline aşamaları · tutar" isEmpty={byStage.length === 0}>
              <View style={{ gap: t.spacing[2.5] }}>
                {byStage.map((b) => (
                  <View key={b.stageId} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                        {b.name}
                      </Text>
                      <Text variant="caption" weight="semibold" style={{ marginLeft: 8, fontFamily: 'monospace' }}>
                        {formatMoney(b.value)}
                      </Text>
                    </View>
                    <View style={{ height: 8, borderRadius: t.radius.full, backgroundColor: t.colors.muted, overflow: 'hidden' }}>
                      <View style={{ width: `${(b.value / maxStageValue) * 100}%`, height: '100%', borderRadius: t.radius.full, backgroundColor: b.color }} />
                    </View>
                  </View>
                ))}
              </View>
            </ChartCard>

            <View style={{ gap: t.spacing[2] }}>
              <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
                Kayıp Nedenleri
              </Text>
              {lossReasons.length === 0 ? (
                <EmptyState icon="x-circle" title="Kayıp yok" description="Kaybedilen fırsat bulunmuyor." />
              ) : (
                <ListCard>
                  {lossReasons.map((r, i) => (
                    <ListRow
                      key={`${r.reason}-${i}`}
                      icon="x-circle"
                      title={r.reason || 'Belirtilmemiş'}
                      subtitle={`${r.count} fırsat`}
                      trailing={
                        <Text variant="label" weight="semibold" style={{ fontFamily: 'monospace' }}>
                          {formatMoney(r.value)}
                        </Text>
                      }
                    />
                  ))}
                </ListCard>
              )}
            </View>

            <View style={{ gap: t.spacing[2] }}>
              <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
                Etkinlik Liderlik Tablosu
              </Text>
              {leaderboard.length === 0 ? (
                <EmptyState icon="activity" title="Etkinlik yok" description="Etkinlik kaydı bulunmuyor." />
              ) : (
                <ListCard>
                  {leaderboard.map((row) => (
                    <ListRow
                      key={row.ownerId ?? row.ownerName}
                      icon="user"
                      title={row.ownerName}
                      subtitle={`${row.completed} tamamlandı`}
                      trailing={
                        <Text variant="label" weight="semibold" style={{ fontFamily: 'monospace' }}>
                          {row.total}
                        </Text>
                      }
                    />
                  ))}
                </ListCard>
              )}
            </View>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>{children}</View>
}
