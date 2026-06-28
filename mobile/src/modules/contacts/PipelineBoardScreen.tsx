// Satış Hattı (Kanban board) — a horizontally scrolling board with one column per
// pipeline stage. Each column has a colored header (name, deal count, total value,
// weighted forecast) and the stage's deal cards. No native drag & drop on mobile:
// each card has an "Aşama" button that opens StageChangePicker to move the deal.

import * as React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import {
  ContactsPermissions,
  type OpportunityDto,
  type PipelineDto,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  EmptyState,
  FormSelect,
  HeaderAction,
  PermissionRequired,
  Screen,
  Skeleton,
  Text,
  withAlpha,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './format'
import { StageChangePicker } from './StageChangePicker'

const COLUMN_WIDTH = 280

export function PipelineBoardScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const { submit } = useSubmit()

  const canRead = hasPermission(ContactsPermissions.opportunitiesRead)
  const canWrite = hasPermission(ContactsPermissions.opportunitiesWrite)
  const canReadPipelines = hasPermission(ContactsPermissions.pipelinesRead)

  const [pipelineId, setPipelineId] = React.useState<string>('')
  const [mine, setMine] = React.useState(false)
  const [moving, setMoving] = React.useState<OpportunityDto | null>(null)

  const pipelines = useAsync(() => api.contacts.pipelines.list(), [], { enabled: canReadPipelines })

  // Default to the org's default pipeline once they load.
  React.useEffect(() => {
    if (pipelineId || !pipelines.data || pipelines.data.length === 0) return
    const def = pipelines.data.find((p) => p.isDefault) ?? pipelines.data[0]
    if (def) setPipelineId(def.id)
  }, [pipelines.data, pipelineId])

  const pipeline: PipelineDto | undefined = (pipelines.data ?? []).find((p) => p.id === pipelineId)
  const stages = React.useMemo(
    () => (pipeline ? [...pipeline.stages].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [pipeline],
  )

  const opps = useAsync(
    () => api.contacts.opportunities.list({ pipelineId, mine: mine || undefined }),
    [pipelineId, mine],
    { enabled: canRead && !!pipelineId },
  )

  const byStage = React.useMemo(() => {
    const map = new Map<string, OpportunityDto[]>()
    for (const s of stages) map.set(s.id, [])
    for (const o of opps.data ?? []) map.get(o.stageId)?.push(o)
    return map
  }, [stages, opps.data])

  const move = (stageId: string) => {
    const deal = moving
    setMoving(null)
    if (!deal || stageId === deal.stageId) return
    submit(() => api.contacts.opportunities.move(deal.id, { stageId }).then(() => opps.refetch()), {
      errorTitle: 'Taşıma başarısız',
    })
  }

  const pipelineOptions = (pipelines.data ?? []).map((p) => ({
    value: p.id,
    label: p.isDefault ? `${p.name} (Varsayılan)` : p.name,
  }))

  return (
    <PermissionRequired permission={ContactsPermissions.opportunitiesRead} title="Satış Hattı" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Satış Hattı',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('contacts.opportunities.form', {}, 'Yeni fırsat')} />
          ) : undefined,
        }}
        onRefresh={() => {
          pipelines.refetch()
          opps.refetch()
        }}
        refreshing={opps.refreshing}
      >
        {pipelineOptions.length > 0 ? (
          <FormSelect label="Satış Hattı" value={pipelineId} onChange={setPipelineId} options={pipelineOptions} />
        ) : null}
        <View style={{ flexDirection: 'row' }}>
          <Button
            title="Benim İşlerim"
            icon="user"
            size="sm"
            variant={mine ? 'default' : 'outline'}
            onPress={() => setMine((m) => !m)}
          />
        </View>

        {pipelines.loading ? (
          <Skeleton width="100%" height={200} />
        ) : !pipelines.data || pipelines.data.length === 0 ? (
          <EmptyState icon="filter" title="Satış hattı yok" description="Henüz bir satış hattı tanımlanmamış." />
        ) : stages.length === 0 ? (
          <EmptyState icon="filter" title="Aşama yok" description="Bu satış hattında aşama bulunmuyor." />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.spacing[3], paddingVertical: t.spacing[1] }}
          >
            {stages.map((stage) => {
              const deals = byStage.get(stage.id) ?? []
              const value = deals.reduce((s, d) => s + d.amount, 0)
              const weighted = deals.reduce((s, d) => s + d.expectedRevenue, 0)
              return (
                <View
                  key={stage.id}
                  style={{
                    width: COLUMN_WIDTH,
                    borderRadius: t.radius.xl,
                    borderWidth: 1,
                    borderColor: t.colors.border,
                    backgroundColor: t.colors.card,
                    overflow: 'hidden',
                  }}
                >
                  {/* colored header */}
                  <View style={{ padding: t.spacing[3], gap: 4, backgroundColor: withAlpha(stage.color, 0.12), borderBottomWidth: 2, borderBottomColor: stage.color }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1.5], flex: 1 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: stage.color }} />
                        <Text weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                          {stage.name}
                        </Text>
                      </View>
                      <Badge label={String(deals.length)} tone="muted" />
                    </View>
                    <Text variant="caption" tone="muted" style={{ fontFamily: 'monospace' }}>
                      {formatMoney(value)} · ~{formatMoney(weighted)}
                    </Text>
                  </View>

                  {/* deal cards */}
                  <View style={{ padding: t.spacing[2.5], gap: t.spacing[2.5] }}>
                    {deals.length === 0 ? (
                      <Text variant="caption" tone="muted" style={{ paddingVertical: t.spacing[4], textAlign: 'center' }}>
                        Fırsat yok
                      </Text>
                    ) : (
                      deals.map((o) => (
                        <Pressable
                          key={o.id}
                          onPress={() => nav.navigate('contacts.opportunities.detail', { id: o.id }, o.name)}
                          style={{
                            gap: t.spacing[2],
                            padding: t.spacing[3],
                            borderRadius: t.radius.lg,
                            borderWidth: 1,
                            borderColor: t.colors.border,
                            backgroundColor: t.colors.background,
                          }}
                        >
                          <Text weight="semibold" numberOfLines={2}>
                            {o.name}
                          </Text>
                          {o.contact ? (
                            <Text variant="caption" tone="muted" numberOfLines={1}>
                              {o.contact.name}
                            </Text>
                          ) : null}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing[2] }}>
                            <Text variant="label" weight="semibold" style={{ fontFamily: 'monospace' }}>
                              {formatMoney(o.amount, o.currencyCode)}
                            </Text>
                            {o.isRotting ? <Badge label="Bekliyor" tone="destructive" /> : null}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing[2] }}>
                            <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                              {o.owner?.name ?? 'Atanmamış'}
                            </Text>
                            {canWrite ? (
                              <Button title="Aşama" icon="move" variant="ghost" size="sm" onPress={() => setMoving(o)} />
                            ) : null}
                          </View>
                        </Pressable>
                      ))
                    )}
                  </View>
                </View>
              )
            })}
          </ScrollView>
        )}
      </Screen>

      <StageChangePicker
        visible={!!moving}
        stages={stages}
        currentStageId={moving?.stageId ?? null}
        onClose={() => setMoving(null)}
        onPick={move}
      />
    </PermissionRequired>
  )
}
