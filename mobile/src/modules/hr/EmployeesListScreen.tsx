import * as React from 'react'
import { View } from 'react-native'
import {
  EMPLOYMENT_TYPE_LABELS,
  HrPermissions,
} from '@turbohesap/shared'
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
import { formatMoney } from './format'

export function EmployeesListScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canWrite = hasPermission(HrPermissions.write)
  const [search, setSearch] = React.useState('')

  const employees = useAsync(() => api.hr.employees.list(), [], { enabled: canRead })
  const list = employees.data ?? []

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        (e.departmentKey ?? '').toLowerCase().includes(q) ||
        (e.positionKey ?? '').toLowerCase().includes(q),
    )
  }, [list, search])

  const openForm = () => nav.navigate('hr.employee.entry', {}, 'Yeni personel')

  return (
    <PermissionRequired
      permission={HrPermissions.read}
      title="Personel"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Personel',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? <HeaderAction icon="plus" onPress={openForm} /> : undefined,
        }}
        onRefresh={employees.refetch}
        refreshing={employees.refreshing}
      >
        <Input icon="search" placeholder="Personel ara" value={search} onChangeText={setSearch} />

        {employees.loading ? (
          <SkeletonRows count={6} />
        ) : employees.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={employees.error}
            actionLabel="Tekrar dene"
            onAction={employees.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="users"
            title="Personel bulunamadı"
            description={search ? 'Aramanızla eşleşen kayıt yok.' : 'Henüz personel eklenmemiş.'}
            actionLabel={canWrite && !search ? 'Yeni personel' : undefined}
            onAction={canWrite && !search ? openForm : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Personel
            </Text>
            <ListCard>
              {filtered.map((e) => (
                <ListRow
                  key={e.id}
                  icon="user"
                  title={e.fullName}
                  subtitle={[e.departmentKey, e.positionKey].filter(Boolean).join(' · ') || EMPLOYMENT_TYPE_LABELS[e.employmentType]}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatMoney(e.salaryAmount)}
                      </Text>
                      <Badge
                        label={e.isActive ? 'Aktif' : 'Pasif'}
                        tone={e.isActive ? 'success' : 'muted'}
                      />
                    </View>
                  }
                  onPress={() => nav.navigate('hr.employee.detail', { id: e.id }, e.fullName)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
