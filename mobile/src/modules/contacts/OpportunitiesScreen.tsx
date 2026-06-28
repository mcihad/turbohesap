import * as React from 'react'
import { View } from 'react-native'
import { ContactsPermissions } from '@turbohesap/shared'
import {
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

export function OpportunitiesScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.opportunitiesRead)
  const canWrite = hasPermission(ContactsPermissions.opportunitiesWrite)
  const queryResult = useAsync(() => api.contacts.opportunities.list(), [], { enabled: canRead })

  const list = queryResult.data ?? []

  return (
    <PermissionRequired permission={ContactsPermissions.opportunitiesRead} title="Fırsatlar" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Fırsatlar',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('contacts.opportunities.form', {}, 'Yeni fırsat')} />
          ) : undefined,
        }}
        onRefresh={queryResult.refetch}
        refreshing={queryResult.refreshing}
      >
        {queryResult.loading ? (
          <SkeletonRows count={6} />
        ) : queryResult.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={queryResult.error} actionLabel="Tekrar dene" onAction={queryResult.refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="target"
            title="Fırsat bulunamadı"
            description="Henüz satış fırsatı eklenmemiş."
            actionLabel={canWrite ? 'Yeni fırsat' : undefined}
            onAction={canWrite ? () => nav.navigate('contacts.opportunities.form', {}, 'Yeni fırsat') : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {list.length} Fırsat
            </Text>
            <ListCard>
              {list.map((o) => (
                <ListRow
                  key={o.id}
                  icon="target"
                  title={o.name}
                  subtitle={o.contact?.name ?? 'Cari yok'}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatMoney(o.amount, o.currencyCode)}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1.5] }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: o.stageColor }} />
                        <Text variant="caption" tone="muted">
                          {o.stageName}
                        </Text>
                      </View>
                    </View>
                  }
                  onPress={() => nav.navigate('contacts.opportunities.detail', { id: o.id }, o.name)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
