// DashboardScreen — the Genel module home (mobile counterpart of the web
// dashboard). A greeting, a live API/health pill, headline stats and quick
// links. Top-level screen: no back button, a theme toggle in the header.

import * as React from 'react'
import { View } from 'react-native'

import {
  Badge,
  Card,
  ChartCard,
  type Datum,
  HeaderAction,
  type IconName,
  ListCard,
  ListRow,
  RecentCard,
  Screen,
  Section,
  SegmentBar,
  StatCard,
  Text,
} from '../../components'
import {
  IamPermissions,
  InventoryPermissions,
  LookupsPermissions,
  OrgPermissions,
  SalesPermissions,
} from '@turbohesap/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { displayName } from '../../lib/tokens'
import { useAsync } from '../../lib/use-async'
import { PROFILE_KEY, useModuleNav } from '../../navigation/module-nav-context'
import { ModuleSwitcherButton } from '../../navigation/ModuleSwitcher'
import { useNav } from '../../navigation/nav-context'
import { useThemeControls } from '../../theme/theme-context'

const ACTION_TR: Record<string, string> = { Insert: 'eklendi', Update: 'güncellendi', Delete: 'silindi' }

interface CountTile {
  icon: IconName
  label: string
  n: number
  show: boolean
  tone: 'primary' | 'success' | 'warning' | 'info'
}

export function DashboardScreen() {
  const { user, hasPermission } = useAuth()
  const nav = useNav()
  const { enterModule } = useModuleNav()
  const { theme, toggle } = useThemeControls()
  const t = theme
  const health = useAsync(() => api.health.getHealth(), [])

  const products = useAsync(() => api.inventory.products.list(), [], { enabled: hasPermission(InventoryPermissions.productsRead) })
  const branches = useAsync(() => api.org.branches.list(), [], { enabled: hasPermission(OrgPermissions.branchesRead) })
  const channels = useAsync(() => api.sales.channels.list(), [], { enabled: hasPermission(SalesPermissions.channelsRead) })
  const users = useAsync(() => api.iam.users.list(), [], { enabled: hasPermission(IamPermissions.usersRead) })
  const lists = useAsync(() => api.lookups.lists(), [], { enabled: hasPermission(LookupsPermissions.read) })
  const audit = useAsync(() => api.iam.auditLogs.list({ page: 1, pageSize: 6 }), [], { enabled: hasPermission(IamPermissions.auditRead) })

  const counts = (
    [
      { icon: 'box', label: 'Ürün', n: products.data?.length ?? 0, show: hasPermission(InventoryPermissions.productsRead), tone: 'primary' },
      { icon: 'briefcase', label: 'Şube', n: branches.data?.length ?? 0, show: hasPermission(OrgPermissions.branchesRead), tone: 'info' },
      { icon: 'shopping-bag', label: 'Kanal', n: channels.data?.length ?? 0, show: hasPermission(SalesPermissions.channelsRead), tone: 'success' },
      { icon: 'users', label: 'Kullanıcı', n: users.data?.length ?? 0, show: hasPermission(IamPermissions.usersRead), tone: 'warning' },
      { icon: 'list', label: 'Liste', n: lists.data?.length ?? 0, show: hasPermission(LookupsPermissions.read), tone: 'info' },
    ] as CountTile[]
  ).filter((c) => c.show)

  const dist: Datum[] = counts.map((c) => ({ name: c.label, value: c.n })).filter((d) => d.value > 0)
  const recent = (audit.data?.items ?? []).map((a) => ({ id: a.id, title: `${a.entityType} ${ACTION_TR[a.action] ?? a.action}`, subtitle: a.userName ?? 'sistem', at: a.createdAt }))

  const greeting = user ? displayName(user).split(' ')[0] : ''

  return (
    <Screen
      header={{
        title: 'Genel Bakış',
        subtitle: greeting ? `Merhaba, ${greeting}` : undefined,
        large: true,
        right: (
          <>
            <HeaderAction icon={theme.scheme === 'dark' ? 'sun' : 'moon'} onPress={toggle} />
            <ModuleSwitcherButton />
          </>
        ),
      }}
      onRefresh={health.refetch}
      refreshing={health.refreshing}
    >
      {/* API status */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text variant="label" weight="semibold">
            Sistem durumu
          </Text>
          <Text variant="caption" tone="muted">
            backend · /api/health
          </Text>
        </View>
        <Badge
          label={health.loading ? '…' : health.data?.status === 'ok' ? 'Çevrimiçi' : 'Erişilemiyor'}
          tone={health.data?.status === 'ok' ? 'success' : health.loading ? 'muted' : 'destructive'}
        />
      </Card>

      {/* Cross-module counts */}
      {counts.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
          {counts.map((c) => (
            <View key={c.label} style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>
              <StatCard icon={c.icon} label={c.label} value={String(c.n)} tone={c.tone} />
            </View>
          ))}
        </View>
      ) : null}

      {dist.length > 0 ? (
        <ChartCard title="Varlık dağılımı" subtitle="Erişilebilir modüllerdeki kayıtlar">
          <SegmentBar data={dist} />
        </ChartCard>
      ) : null}

      {hasPermission(IamPermissions.auditRead) ? (
        <RecentCard title="Son hareketler" icon="activity" items={recent} emptyText="Henüz hareket yok" />
      ) : null}

      <Section title="Kısayollar">
        <ListCard>
          <ListRow
            icon="bar-chart-2"
            title="Analiz"
            subtitle="Raporlar ve metrikler"
            onPress={() => nav.switchTab('genel.analytics')}
          />
          <ListRow
            icon="user"
            title="Profil"
            subtitle="Hesap, roller ve görünüm"
            onPress={() => enterModule(PROFILE_KEY)}
          />
        </ListCard>
      </Section>

    </Screen>
  )
}
