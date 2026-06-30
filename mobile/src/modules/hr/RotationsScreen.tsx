// Vardiya rotasyonları (cyclic shift patterns) — list of rotation templates.
// Mirrors the web shift-rotations-page.
import * as React from 'react'
import { View } from 'react-native'
import { HrPermissions } from '@turbohesap/shared'
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

export function RotationsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.shiftsRead)
  const canWrite = hasPermission(HrPermissions.shiftsWrite)
  const [search, setSearch] = React.useState('')

  const rotations = useAsync(() => api.hr.shiftRotations.list(), [], { enabled: canRead })
  const list = rotations.data ?? []

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => r.name.toLowerCase().includes(q))
  }, [list, search])

  const openForm = () => nav.navigate('hr.rotation.entry', {}, 'Yeni rotasyon')

  return (
    <PermissionRequired
      permission={HrPermissions.shiftsRead}
      title="Rotasyonlar"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Rotasyonlar',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? <HeaderAction icon="plus" onPress={openForm} /> : undefined,
        }}
        onRefresh={rotations.refetch}
        refreshing={rotations.refreshing}
      >
        <Input icon="search" placeholder="Rotasyon ara" value={search} onChangeText={setSearch} />

        {rotations.loading ? (
          <SkeletonRows count={4} />
        ) : rotations.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={rotations.error}
            actionLabel="Tekrar dene"
            onAction={rotations.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="repeat"
            title="Rotasyon bulunamadı"
            description={search ? 'Aramanızla eşleşen kayıt yok.' : 'Henüz rotasyon tanımlanmamış.'}
            actionLabel={canWrite && !search ? 'Yeni rotasyon' : undefined}
            onAction={canWrite && !search ? openForm : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Rotasyon
            </Text>
            <ListCard>
              {filtered.map((r) => (
                <ListRow
                  key={r.id}
                  icon="repeat"
                  title={r.name}
                  subtitle={`${r.cycleLengthDays} günlük döngü · Çapa ${r.anchorDate?.slice(0, 10) ?? '—'}`}
                  trailing={
                    <Badge label={r.isActive ? 'Aktif' : 'Pasif'} tone={r.isActive ? 'success' : 'muted'} />
                  }
                  onPress={
                    canWrite ? () => nav.navigate('hr.rotation.entry', { id: r.id }, r.name) : undefined
                  }
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
