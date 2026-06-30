// Giriş Alanları (geofence check-in alanları) listesi. Web'deki checkin-areas
// sayfasının mobil karşılığı. Satır → düzenleme; başlıktaki + → yeni alan.
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

export function CheckinAreasScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.areasRead)
  const canWrite = hasPermission(HrPermissions.areasWrite)
  const [search, setSearch] = React.useState('')

  const areas = useAsync(() => api.hr.checkinAreas.list(), [], { enabled: canRead })
  const list = areas.data ?? []

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.code ?? '').toLowerCase().includes(q),
    )
  }, [list, search])

  const openForm = () => nav.navigate('hr.area.entry', {}, 'Yeni giriş alanı')

  return (
    <PermissionRequired
      permission={HrPermissions.areasRead}
      title="Giriş Alanları"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Giriş Alanları',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? <HeaderAction icon="plus" onPress={openForm} /> : undefined,
        }}
        onRefresh={areas.refetch}
        refreshing={areas.refreshing}
      >
        <Input icon="search" placeholder="Alan ara" value={search} onChangeText={setSearch} />

        {areas.loading ? (
          <SkeletonRows count={6} />
        ) : areas.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={areas.error}
            actionLabel="Tekrar dene"
            onAction={areas.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="map-pin"
            title="Giriş alanı bulunamadı"
            description={search ? 'Aramanızla eşleşen kayıt yok.' : 'Henüz giriş alanı eklenmemiş.'}
            actionLabel={canWrite && !search ? 'Yeni giriş alanı' : undefined}
            onAction={canWrite && !search ? openForm : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Alan
            </Text>
            <ListCard>
              {filtered.map((a) => {
                const tip =
                  a.geom?.type === 'Polygon' ? 'Poligon' : a.geom?.type === 'Point' ? 'Nokta' : '—'
                const allEmployees = a.employeeCount === 0
                return (
                  <ListRow
                    key={a.id}
                    icon={a.geom?.type === 'Point' ? 'map-pin' : 'hexagon'}
                    title={a.name}
                    subtitle={[a.code, `${tip} · ${a.toleranceMeters} m`].filter(Boolean).join(' · ')}
                    trailing={
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Badge
                          label={allEmployees ? 'Tümü' : `${a.employeeCount} personel`}
                          tone={allEmployees ? 'muted' : 'primary'}
                        />
                        {!a.isActive ? <Badge label="Pasif" tone="muted" /> : null}
                      </View>
                    }
                    onPress={() => nav.navigate('hr.area.entry', { id: a.id }, a.name)}
                  />
                )
              })}
            </ListCard>
            <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              "Tümü": atanmış personel yok — tüm aktif personel bu alandan giriş yapabilir.
            </Text>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
