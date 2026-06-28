import { View } from 'react-native'
import { ContactsPermissions } from '@turbohesap/shared'
import {
  Badge,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  ListCard,
  ListRow,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './format'

export function ContactGroupDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.contactsRead)

  const id = String(nav.current.params?.id ?? '')

  const group = useAsync(() => api.contacts.groups.get(id), [id], { enabled: canRead && !!id })
  const allGroups = useAsync(() => api.contacts.groups.list(), [id], { enabled: canRead && !!id })
  const groupContacts = useAsync(() => api.contacts.contacts.list({ groupId: id }), [id], {
    enabled: canRead && !!id,
  })

  const g = group.data

  if (!canRead) {
    return (
      <Screen header={{ title: 'Grup', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  const subGroups = allGroups.data?.filter((x) => x.parentId === id) ?? []
  const contacts = groupContacts.data ?? []
  const parent = g?.parentId ? allGroups.data?.find((x) => x.id === g.parentId) : undefined

  return (
    <Screen
      header={{
        title: g?.name ?? 'Grup',
        subtitle: g?.code,
        onBack: nav.goBack,
      }}
      onRefresh={() => {
        group.refetch()
        allGroups.refetch()
        groupContacts.refetch()
      }}
      refreshing={group.refreshing || allGroups.refreshing || groupContacts.refreshing}
    >
      {group.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={13} />
          </View>
        </Card>
      ) : group.error || !g ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={group.error ?? 'Grup bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={group.refetch}
        />
      ) : (
        <>
          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Kod" value={g.code || '—'} mono />
                <Field label="Üst grup" value={parent ? parent.name : 'Kök grup'} />
                <Field label="Cari sayısı" value={String(g.contactCount)} />
                <Field label="Durum" value={g.isActive ? 'Aktif' : 'Pasif'} />
                <Field label="Oluşturma" value={formatDate(g.createdAt)} />
              </FieldGrid>
            </Card>
          </Section>

          <Section title={`Alt gruplar (${subGroups.length})`}>
            {subGroups.length === 0 ? (
              <EmptyState icon="folder" title="Alt grup yok" description="Bu grubun alt grubu bulunmuyor." />
            ) : (
              <ListCard>
                {subGroups.map((sg) => (
                  <ListRow
                    key={sg.id}
                    icon="folder"
                    title={sg.name}
                    subtitle={sg.code || '—'}
                    trailing={<Badge label={`${sg.contactCount} cari`} tone="muted" />}
                    onPress={() => nav.navigate('contacts.groups.detail', { id: sg.id }, sg.name)}
                  />
                ))}
              </ListCard>
            )}
          </Section>

          <Section title={`Bu gruptaki cariler (${contacts.length})`}>
            {groupContacts.loading ? (
              <Card>
                <Skeleton width="70%" height={15} />
              </Card>
            ) : contacts.length === 0 ? (
              <EmptyState icon="users" title="Cari yok" description="Bu gruba bağlı cari bulunmuyor." />
            ) : (
              <ListCard>
                {contacts.map((c) => (
                  <ListRow
                    key={c.id}
                    icon="users"
                    title={c.name}
                    subtitle={c.code}
                    trailing={
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatMoney(c.balance, c.currencyCode)}
                      </Text>
                    }
                    onPress={() => nav.navigate('contacts.contacts.detail', { id: c.id }, c.name)}
                  />
                ))}
              </ListCard>
            )}
          </Section>
        </>
      )}
    </Screen>
  )
}
