import * as React from 'react'
import { View } from 'react-native'
import { ContactsPermissions, type ContactRole } from '@turbohesap/shared'
import {
  Badge,
  EmptyState,
  HeaderAction,
  Input,
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
import { balanceSideLabel, formatMoney } from './format'
import { NotificationBell } from './NotificationBell'

const ROLE_LABELS: Record<ContactRole, string> = {
  customer: 'Müşteri',
  supplier: 'Tedarikçi',
  both: 'Müşteri+Tedarikçi',
  lead: 'Aday',
}

export function ContactsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.contactsRead)
  const canWrite = hasPermission(ContactsPermissions.contactsWrite)
  const [query, setQuery] = React.useState('')
  const queryResult = useAsync(() => api.contacts.contacts.list(), [], { enabled: canRead })

  const filtered = React.useMemo(() => {
    const list = queryResult.data ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((item) =>
      [item.name, item.code, item.email, item.phone].some((f) => f?.toLowerCase().includes(q)),
    )
  }, [queryResult.data, query])

  return (
    <PermissionRequired permission={ContactsPermissions.contactsRead} title="Cariler" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Cariler',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: (
            <>
              <NotificationBell />
              {canWrite ? (
                <HeaderAction icon="plus" onPress={() => nav.navigate('contacts.contacts.form', {}, 'Yeni cari')} />
              ) : null}
            </>
          ),
        }}
        onRefresh={queryResult.refetch}
        refreshing={queryResult.refreshing}
      >
        <Input icon="search" placeholder="Cari adı, kodu veya iletişim" value={query} onChangeText={setQuery} />

        {queryResult.loading ? (
          <SkeletonRows count={6} />
        ) : queryResult.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={queryResult.error} actionLabel="Tekrar dene" onAction={queryResult.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="users"
            title="Cari bulunamadı"
            description={query ? 'Eşleşen cari bulunamadı.' : 'Henüz cari eklenmemiş.'}
            actionLabel={canWrite && !query ? 'Yeni cari' : undefined}
            onAction={canWrite && !query ? () => nav.navigate('contacts.contacts.form', {}, 'Yeni cari') : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Cari
            </Text>
            <ListCard>
              {filtered.map((item) => (
                <ListRow
                  key={item.id}
                  icon="user"
                  title={item.name}
                  subtitle={`${item.code} · ${ROLE_LABELS[item.role]}`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatMoney(item.balance, item.currencyCode)}
                      </Text>
                      <Badge
                        label={balanceSideLabel(item.balanceSide)}
                        tone={item.balanceSide === 'debit' ? 'warning' : 'success'}
                      />
                    </View>
                  }
                  onPress={() => nav.navigate('contacts.contacts.detail', { id: item.id }, item.name)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
