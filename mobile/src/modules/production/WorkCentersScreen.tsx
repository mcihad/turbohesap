// İş Merkezleri — üretim istasyonları (makine+işçilik kapasitesi ve saat ücreti).
// List + "+" navigates to the entry form; tapping a row edits it. Mirrors the
// orders/stocktake list shells (PermissionRequired + Screen + ListCard rows).

import * as React from 'react'
import { ProductionPermissions } from '@turbohesap/shared'
import {
  Badge,
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
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './format'

export function WorkCentersScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canWrite = hasPermission(ProductionPermissions.write)

  const data = useAsync(() => api.production.workCenters.list(), [], { enabled: canRead })
  const list = data.data ?? []

  const openForm = () => nav.navigate('production.workcenter.entry', {}, 'Yeni iş merkezi')

  return (
    <PermissionRequired
      permission={ProductionPermissions.read}
      title="İş İstasyonları"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'İş İstasyonları',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? <HeaderAction icon="plus" onPress={openForm} /> : undefined,
        }}
        onRefresh={data.refetch}
        refreshing={data.refreshing}
      >
        {data.loading ? (
          <SkeletonRows count={6} />
        ) : data.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={data.error}
            actionLabel="Tekrar dene"
            onAction={data.refetch}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon="cpu"
            title="İş merkezi bulunamadı"
            description="Henüz iş merkezi tanımlanmamış."
            actionLabel={canWrite ? 'Yeni iş merkezi' : undefined}
            onAction={canWrite ? openForm : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {list.length} İş Merkezi
            </Text>
            <ListCard>
              {list.map((wc) => (
                <ListRow
                  key={wc.id}
                  icon="cpu"
                  title={wc.name}
                  subtitle={`${wc.code} · ${formatMoney(wc.costPerHour, wc.currency)}/saat`}
                  trailing={
                    <Badge label={wc.isActive ? 'Aktif' : 'Pasif'} tone={wc.isActive ? 'success' : 'muted'} />
                  }
                  onPress={() => nav.navigate('production.workcenter.entry', { id: wc.id }, wc.name)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
