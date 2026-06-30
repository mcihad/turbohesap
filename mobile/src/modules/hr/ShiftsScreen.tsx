// Vardiyalar (shift definitions) — list of reusable shift templates. Tapping a
// row opens the dedicated entry form; the header "+" creates a new one. Mirrors
// the web shifts-page.
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

export function ShiftsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.shiftsRead)
  const canWrite = hasPermission(HrPermissions.shiftsWrite)
  const [search, setSearch] = React.useState('')

  const shifts = useAsync(() => api.hr.shifts.list(), [], { enabled: canRead })
  const list = shifts.data ?? []

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.code ?? '').toLowerCase().includes(q),
    )
  }, [list, search])

  const openForm = () => nav.navigate('hr.shift.entry', {}, 'Yeni vardiya')

  return (
    <PermissionRequired
      permission={HrPermissions.shiftsRead}
      title="Vardiyalar"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Vardiyalar',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? <HeaderAction icon="plus" onPress={openForm} /> : undefined,
        }}
        onRefresh={shifts.refetch}
        refreshing={shifts.refreshing}
      >
        <Input icon="search" placeholder="Vardiya ara" value={search} onChangeText={setSearch} />

        {shifts.loading ? (
          <SkeletonRows count={5} />
        ) : shifts.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={shifts.error}
            actionLabel="Tekrar dene"
            onAction={shifts.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="clock"
            title="Vardiya bulunamadı"
            description={search ? 'Aramanızla eşleşen kayıt yok.' : 'Henüz vardiya tanımlanmamış.'}
            actionLabel={canWrite && !search ? 'Yeni vardiya' : undefined}
            onAction={canWrite && !search ? openForm : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Vardiya
            </Text>
            <ListCard>
              {filtered.map((s) => (
                <ListRow
                  key={s.id}
                  leading={
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: t.radius.lg,
                        backgroundColor: s.color || t.colors.muted,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text variant="caption" weight="semibold" style={{ color: '#FFFFFF' }}>
                        {(s.code || s.name).slice(0, 3).toUpperCase()}
                      </Text>
                    </View>
                  }
                  title={s.name}
                  subtitle={
                    s.isDayOff
                      ? 'İzin günü (OFF)'
                      : `${s.startTime} – ${s.endTime}${s.crossesMidnight ? ' (gece)' : ''} · ${s.breaks?.length ?? 0} mola`
                  }
                  trailing={
                    <Badge label={s.isActive ? 'Aktif' : 'Pasif'} tone={s.isActive ? 'success' : 'muted'} />
                  }
                  onPress={
                    canWrite ? () => nav.navigate('hr.shift.entry', { id: s.id }, s.name) : undefined
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
