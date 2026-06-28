// Contacts (Cari) dashboard body (mobile) — stat tiles for the contact book and
// the open sales pipeline, plus the most recently added contacts. Mirrors
// FinanceDashboard / FinanceStats.

import * as React from 'react'
import { View } from 'react-native'
import { ContactsPermissions } from '@turbohesap/shared'
import { ListCard, ListRow, Section, StatCard, Text } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './format'

export function ContactsDashboard() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canReadOpportunities = hasPermission(ContactsPermissions.opportunitiesRead)

  const contacts = useAsync(() => api.contacts.contacts.list(), [])
  const opportunities = useAsync(() => api.contacts.opportunities.list({ openOnly: true }), [], {
    enabled: canReadOpportunities,
  })

  const contactList = contacts.data ?? []
  const oppList = opportunities.data ?? []

  const totalReceivable = contactList
    .filter((c) => c.balanceSide === 'debit')
    .reduce((acc, c) => acc + c.balance, 0)
  const totalPayable = contactList
    .filter((c) => c.balanceSide === 'credit')
    .reduce((acc, c) => acc + c.balance, 0)
  const openRevenue = oppList.reduce((acc, o) => acc + o.expectedRevenue, 0)

  const recent = React.useMemo(
    () =>
      [...contactList]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 5),
    [contactList],
  )

  return (
    <>
      <Section title="Cari Özetleri">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
          <Cell>
            <StatCard icon="users" tone="primary" label="Cari Sayısı" value={String(contactList.length)} />
          </Cell>
          <Cell>
            <StatCard
              icon="target"
              tone="info"
              label="Açık Fırsat"
              value={canReadOpportunities ? String(oppList.length) : '—'}
              delta={canReadOpportunities && oppList.length > 0 ? formatMoney(openRevenue, 'TRY') : undefined}
              deltaTone="info"
            />
          </Cell>
          <Cell>
            <StatCard icon="arrow-down-left" tone="success" label="Toplam Alacak" value={formatMoney(totalReceivable, 'TRY')} />
          </Cell>
          <Cell>
            <StatCard icon="arrow-up-right" tone="warning" label="Toplam Borç" value={formatMoney(totalPayable, 'TRY')} />
          </Cell>
        </View>
      </Section>

      <Section title="Son Cariler">
        {recent.length === 0 ? (
          <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
            Henüz tanımlı cari yok
          </Text>
        ) : (
          <ListCard>
            {recent.map((c) => (
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
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>{children}</View>
}
