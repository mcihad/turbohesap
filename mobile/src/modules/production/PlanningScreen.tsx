// Planlama (MRP) — planlama koşuları listesi + "Planlama Çalıştır" (talep/arz
// netleştirip öneri üretir). Header'daki sliders ikonu min/max kurallarına gider.
// Bir koşuya dokununca öneri detayına (indented by level) drill-down.

import * as React from 'react'
import { ProductionPermissions } from '@turbohesap/shared'
import {
  Badge,
  Button,
  EmptyState,
  HeaderAction,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { PLANNING_STATUS_LABELS, PLANNING_STATUS_TONES } from './format'

export function PlanningScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canRun = hasPermission(ProductionPermissions.planningRun)
  const { submit, busy } = useSubmit()

  const runs = useAsync(() => api.production.planning.list(), [], { enabled: canRead })
  const list = runs.data ?? []

  const runPlanning = () =>
    confirmDestructive(
      'MRP Planlama',
      'Talep/arz netleştirilip öneriler üretilecek. Devam edilsin mi?',
      () =>
        void submit(
          async () => {
            const run = await api.production.planning.run()
            runs.refetch()
            nav.navigate('production.planning.detail', { id: run.id }, run.runNo)
          },
          { errorTitle: 'Planlama çalıştırılamadı' },
        ),
      'Çalıştır',
    )

  return (
    <PermissionRequired
      permission={ProductionPermissions.read}
      title="Planlama"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Planlama',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: (
            <HeaderAction
              icon="sliders"
              onPress={() => nav.navigate('production.reorder', {}, 'Min/Max Kuralları')}
            />
          ),
        }}
        onRefresh={runs.refetch}
        refreshing={runs.refreshing}
        footer={
          canRun ? (
            <Button title="Planlama Çalıştır" icon="play" fullWidth loading={busy} onPress={runPlanning} />
          ) : undefined
        }
      >
        {runs.loading ? (
          <SkeletonRows count={6} />
        ) : runs.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={runs.error}
            actionLabel="Tekrar dene"
            onAction={runs.refetch}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon="trending-up"
            title="Planlama bulunamadı"
            description="Henüz planlama çalıştırılmamış."
            actionLabel={canRun ? 'Planlama Çalıştır' : undefined}
            onAction={canRun ? runPlanning : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {list.length} Koşu
            </Text>
            <ListCard>
              {list.map((r) => (
                <ListRow
                  key={r.id}
                  icon="trending-up"
                  title={r.runNo}
                  subtitle={`${formatDate(r.runDate)} · ${r.suggestions.length} öneri · ${r.horizonDays} gün ufuk`}
                  trailing={<Badge label={PLANNING_STATUS_LABELS[r.status]} tone={PLANNING_STATUS_TONES[r.status]} />}
                  onPress={() => nav.navigate('production.planning.detail', { id: r.id }, r.runNo)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
