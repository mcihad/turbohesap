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
  LoadMoreFooter,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useDebouncedValue } from '../../lib/use-debounced-value'
import { usePaginated } from '../../lib/use-paginated'
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
  const search = useDebouncedValue(query.trim(), 350)
  const contacts = usePaginated(
    (page) => api.contacts.contacts.listPage({ page, pageSize: 30, search: search || undefined }),
    [search],
    { enabled: canRead },
  )
  const items = contacts.items

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
        onRefresh={contacts.refresh}
        refreshing={contacts.refreshing}
        onEndReached={contacts.loadMore}
      >
        <Input icon="search" placeholder="Cari adı, kodu veya iletişim" value={query} onChangeText={setQuery} />

        {contacts.loading ? (
          <SkeletonRows count={6} />
        ) : contacts.error && items.length === 0 ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={contacts.error} actionLabel="Tekrar dene" onAction={contacts.refresh} />
        ) : items.length === 0 ? (
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
              {items.length} / {contacts.total} Cari
            </Text>
            <ListCard>
              {items.map((item) => (
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
            <LoadMoreFooter loadingMore={contacts.loadingMore} hasMore={contacts.hasMore} total={contacts.total} />
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
