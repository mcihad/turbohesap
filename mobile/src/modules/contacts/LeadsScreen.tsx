// Leads (Adaylar) — the CRM lead list. Shows lead source/status, sales owner and
// the running balance, links into the contact detail, and offers a per-row
// "Dönüştür" action that opens the ConvertLeadSheet.

import * as React from 'react'
import { View } from 'react-native'
import { ContactsPermissions, type ContactDto } from '@turbohesap/shared'

import {
  Badge,
  Button,
  EmptyState,
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
import { ConvertLeadSheet } from './ConvertLeadSheet'

export function LeadsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.contactsRead)
  const canWrite = hasPermission(ContactsPermissions.contactsWrite)
  const queryResult = useAsync(() => api.contacts.contacts.list({ role: 'lead' }), [], { enabled: canRead })

  const [converting, setConverting] = React.useState<ContactDto | null>(null)

  const list = queryResult.data ?? []

  return (
    <PermissionRequired permission={ContactsPermissions.contactsRead} title="Adaylar" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Adaylar',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
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
            icon="user-plus"
            title="Aday bulunamadı"
            description="Henüz potansiyel müşteri (aday) eklenmemiş."
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {list.length} Aday
            </Text>
            <ListCard>
              {list.map((lead) => (
                <ListRow
                  key={lead.id}
                  icon="user-plus"
                  title={lead.name}
                  subtitle={[lead.leadSource, lead.owner?.name].filter(Boolean).join(' · ') || lead.code}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatMoney(lead.balance, lead.currencyCode)}
                      </Text>
                      {lead.leadStatus ? <Badge label={lead.leadStatus} tone="info" /> : null}
                      {canWrite ? (
                        <Button title="Dönüştür" variant="outline" size="sm" icon="user-check" onPress={() => setConverting(lead)} />
                      ) : null}
                    </View>
                  }
                  chevron={false}
                  onPress={() => nav.navigate('contacts.contacts.detail', { id: lead.id }, lead.name)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>

      <ConvertLeadSheet
        visible={!!converting}
        contact={converting}
        onClose={() => setConverting(null)}
        onConverted={() => {
          setConverting(null)
          queryResult.refetch()
        }}
      />
    </PermissionRequired>
  )
}
