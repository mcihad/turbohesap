import * as React from 'react'
import { Pressable, View } from 'react-native'
import {
  ContactsPermissions,
  IamPermissions,
  type ActivityStatus,
  type ActivityType,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  HeaderAction,
  Icon,
  type IconName,
  Screen,
  Section,
  Skeleton,
  StatCard,
  Text,
  withAlpha,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate, formatRelative } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { AiInsightsCard } from './AiInsightsCard'
import { CloseOpportunitySheet } from './CloseOpportunitySheet'
import { SendMessageSheet } from './SendMessageSheet'
import { formatMoney } from './format'

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: 'Not',
  call: 'Arama',
  meeting: 'Toplantı',
  email: 'E-posta',
  task: 'Görev',
}

const ACTIVITY_TYPE_ICONS: Record<ActivityType, IconName> = {
  note: 'file-text',
  call: 'phone',
  meeting: 'users',
  email: 'mail',
  task: 'check-square',
}

const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  open: 'Açık',
  in_progress: 'Devam ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

const ACTIVITY_STATUS_TONES: Record<ActivityStatus, 'primary' | 'warning' | 'success' | 'muted'> = {
  open: 'primary',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'muted',
}

export function OpportunityDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const { submit, busy } = useSubmit()

  const canRead = hasPermission(ContactsPermissions.opportunitiesRead)
  const canWrite = hasPermission(ContactsPermissions.opportunitiesWrite)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const canActRead = hasPermission(ContactsPermissions.activitiesRead)
  const canActWrite = hasPermission(ContactsPermissions.activitiesWrite)

  const id = String(nav.current.params?.id ?? '')

  const opp = useAsync(() => api.contacts.opportunities.get(id), [id], {
    enabled: canRead && !!id,
  })
  const activities = useAsync(() => api.contacts.activities.list({ opportunityId: id }), [id], {
    enabled: canActRead && !!id,
  })

  const o = opp.data
  const pipelineId = o?.pipelineId

  const pipeline = useAsync(() => api.contacts.pipelines.get(pipelineId as string), [pipelineId], {
    enabled: !!pipelineId,
  })

  const [closeSheet, setCloseSheet] = React.useState(false)
  const [sendSheet, setSendSheet] = React.useState(false)

  const stages = React.useMemo(
    () => (pipeline.data ? [...pipeline.data.stages].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [pipeline.data],
  )

  const changeStage = (stageId: string) => {
    if (!o || stageId === o.stageId) return
    submit(() => api.contacts.opportunities.move(id, { stageId }).then(() => opp.refetch()), {
      errorTitle: 'Aşama değiştirilemedi',
    })
  }

  if (!canRead) {
    return (
      <Screen header={{ title: 'Fırsat Detayı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: o?.name ?? 'Fırsat Detayı',
        subtitle: o ? `${o.contact?.name ?? 'Cari yok'} · ${o.stageName}` : undefined,
        onBack: nav.goBack,
        right: o ? (
          <>
            {canWrite ? (
              <HeaderAction icon="send" onPress={() => setSendSheet(true)} />
            ) : null}
            {canWrite && !o.isClosed ? (
              <HeaderAction icon="check-circle" onPress={() => setCloseSheet(true)} />
            ) : null}
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() =>
                  nav.navigate('iam.audit.entity', { entityType: 'Opportunity', entityId: id }, 'Denetim')
                }
              />
            ) : null}
            {canWrite ? (
              <HeaderAction
                icon="edit-2"
                onPress={() => nav.navigate('contacts.opportunities.form', { id }, 'Fırsatı düzenle')}
              />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={() => {
        opp.refetch()
        activities.refetch()
        pipeline.refetch()
      }}
      refreshing={opp.refreshing || activities.refreshing}
    >
      {opp.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={13} />
          </View>
        </Card>
      ) : opp.error || !o ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={opp.error ?? 'Fırsat bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={opp.refetch}
        />
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
            <Cell>
              <StatCard icon="dollar-sign" tone="primary" label="Fırsat Tutarı" value={formatMoney(o.amount, o.currencyCode)} />
            </Cell>
            <Cell>
              <StatCard icon="trending-up" tone="success" label="Tahmini Ciro" value={formatMoney(o.expectedRevenue, o.currencyCode)} />
            </Cell>
            <Cell>
              <StatCard icon="percent" tone="info" label="Olasılık" value={`%${o.probability}`} />
            </Cell>
            <Cell>
              <StatCard icon="calendar" tone="warning" label="Tahmini Kapanış" value={o.expectedCloseDate ? formatDate(o.expectedCloseDate) : '—'} />
            </Cell>
          </View>

          <Section title="Aşama">
            <Card>
              {pipeline.loading ? (
                <Skeleton width="80%" height={36} />
              ) : stages.length === 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1.5] }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: o.stageColor }} />
                  <Text variant="label" weight="medium">
                    {o.stageName}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] }}>
                  {stages.map((stage) => {
                    const active = stage.id === o.stageId
                    return (
                      <Pressable
                        key={stage.id}
                        disabled={!canWrite || busy}
                        onPress={() => changeStage(stage.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: t.spacing[1.5],
                          paddingVertical: t.spacing[2],
                          paddingHorizontal: t.spacing[3],
                          borderRadius: t.radius.full,
                          borderWidth: 1,
                          borderColor: active ? stage.color : t.colors.border,
                          backgroundColor: active ? stage.color : 'transparent',
                          opacity: !canWrite ? 0.9 : 1,
                        }}
                      >
                        {!active ? (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: stage.color }} />
                        ) : null}
                        <Text
                          variant="label"
                          weight={active ? 'semibold' : 'medium'}
                          style={{ color: active ? '#FFFFFF' : t.colors.mutedForeground }}
                        >
                          {stage.name}
                        </Text>
                        <Text
                          variant="caption"
                          style={{
                            color: active ? withAlpha('#FFFFFF', 0.8) : t.colors.mutedForeground,
                            fontFamily: 'monospace',
                          }}
                        >
                          %{stage.probability}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </Card>
          </Section>

          <Section title="Genel">
            <Card>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[1.5], marginBottom: t.spacing[3] }}>
                {o.isRotting ? <Badge label="Bekliyor" tone="destructive" /> : null}
                {o.isWon ? <Badge label="Kazanıldı" tone="success" /> : null}
                {o.isClosed && !o.isWon ? <Badge label="Kapandı" tone="destructive" /> : null}
                {!o.isClosed ? <Badge label="Açık" tone="muted" /> : null}
              </View>
              <FieldGrid>
                {o.contact ? <Field label="Cari" value={o.contact.name} /> : null}
                <Field label="Para Birimi" value={o.currencyCode} mono />
                {o.source ? <Field label="Kaynak" value={o.source} /> : null}
                <Field label="Aşama" value={o.stageName} />
                <Field label="Sorumlu" value={o.owner?.name ?? 'Atanmamış'} />
                <Field label="Aşamada Geçen" value={`${o.daysInStage} gün`} />
                {o.winReason ? <Field label="Kazanma Nedeni" value={o.winReason} /> : null}
                {o.lossReason ? <Field label="Kaybetme Nedeni" value={o.lossReason} /> : null}
                <Field label="Oluşturma" value={formatDate(o.createdAt)} />
                <Field label="Güncelleme" value={formatDate(o.updatedAt)} />
                {o.notes ? <Field label="Notlar" value={o.notes} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          <Section>
            <AiInsightsCard opportunityId={id} />
          </Section>

          {canActRead ? (
            <Section
              title="Etkinlikler"
              action={
                canActWrite ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Etkinlik ekle"
                    onPress={() => nav.navigate('contacts.activities.form', { opportunityId: id }, 'Yeni etkinlik')}
                  />
                ) : undefined
              }
            >
              {activities.loading ? (
                <Card>
                  <Skeleton width="70%" height={15} />
                </Card>
              ) : !activities.data || activities.data.length === 0 ? (
                <EmptyState icon="activity" title="Etkinlik yok" description="Bu fırsata ait etkinlik bulunmuyor." />
              ) : (
                <Card>
                  {activities.data.map((a, index) => {
                    const last = index === activities.data!.length - 1
                    const tone = ACTIVITY_STATUS_TONES[a.status]
                    const color =
                      tone === 'success'
                        ? t.colors.success
                        : tone === 'warning'
                          ? t.colors.warning
                          : tone === 'muted'
                            ? t.colors.mutedForeground
                            : t.colors.primary
                    const at = a.dueDate ?? a.createdAt
                    return (
                      <Pressable
                        key={a.id}
                        disabled={!canActWrite}
                        onPress={() =>
                          canActWrite &&
                          nav.navigate(
                            'contacts.activities.form',
                            { opportunityId: id, id: a.id },
                            'Etkinlik düzenle',
                          )
                        }
                        style={{ flexDirection: 'row', gap: t.spacing[3] }}
                      >
                        {/* timeline rail: dot + connecting line */}
                        <View style={{ alignItems: 'center', width: 36 }}>
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: withAlpha(color, 0.15),
                            }}
                          >
                            <Icon name={ACTIVITY_TYPE_ICONS[a.activityType]} size={18} color={color} />
                          </View>
                          {!last ? (
                            <View
                              style={{
                                flex: 1,
                                width: 2,
                                marginVertical: t.spacing[1],
                                backgroundColor: t.colors.border,
                                borderRadius: 1,
                              }}
                            />
                          ) : null}
                        </View>

                        {/* content */}
                        <View style={{ flex: 1, paddingBottom: last ? 0 : t.spacing[4] }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.spacing[2] }}>
                            <Text weight="semibold" style={{ flex: 1 }}>
                              {a.subject}
                            </Text>
                            <Text variant="caption" tone="muted">
                              {formatRelative(at)}
                            </Text>
                          </View>
                          {a.description ? (
                            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                              {a.description}
                            </Text>
                          ) : null}
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[1.5], marginTop: t.spacing[2] }}>
                            <Badge label={ACTIVITY_TYPE_LABELS[a.activityType]} tone="muted" />
                            <Badge label={ACTIVITY_STATUS_LABELS[a.status]} tone={tone} />
                            {a.dueDate ? (
                              <Text variant="caption" tone="muted">
                                {formatDate(a.dueDate)}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </Pressable>
                    )
                  })}
                </Card>
              )}
            </Section>
          ) : null}
        </>
      )}

      <CloseOpportunitySheet
        visible={closeSheet}
        opportunity={o ?? null}
        onClose={() => setCloseSheet(false)}
        onClosed={() => {
          setCloseSheet(false)
          opp.refetch()
        }}
      />

      <SendMessageSheet
        visible={sendSheet}
        contactId={o?.contact?.id ?? o?.contactId ?? null}
        opportunityId={id}
        defaults={{ channel: 'email' }}
        onClose={() => setSendSheet(false)}
        onSent={() => {
          setSendSheet(false)
          activities.refetch()
        }}
      />
    </Screen>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>{children}</View>
}
