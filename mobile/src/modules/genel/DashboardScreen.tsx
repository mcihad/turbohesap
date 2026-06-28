// DashboardScreen — the Genel module home (mobile counterpart of the web
// dashboard). A greeting, a live API/health pill, headline stats and quick
// links. Top-level screen: no back button, a theme toggle in the header.

import * as React from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import {
  Avatar,
  Badge,
  withAlpha,
  Card,
  ChartCard,
  type Datum,
  HeaderAction,
  Icon,
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
  FinancePermissions,
  ContactsPermissions,
  PosPermissions,
} from '@turbohesap/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { displayName, initials } from '../../lib/tokens'
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
  const cashAccounts = useAsync(() => api.finance.cashAccounts.list(), [], { enabled: hasPermission(FinancePermissions.cashAccountsRead) })
  const bankAccounts = useAsync(() => api.finance.bankAccounts.list(), [], { enabled: hasPermission(FinancePermissions.bankAccountsRead) })
  const audit = useAsync(() => api.iam.auditLogs.list({ page: 1, pageSize: 6 }), [], { enabled: hasPermission(IamPermissions.auditRead) })

  // Refresh all state logic
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        health.refetch(),
        hasPermission(InventoryPermissions.productsRead) ? products.refetch() : Promise.resolve(),
        hasPermission(OrgPermissions.branchesRead) ? branches.refetch() : Promise.resolve(),
        hasPermission(SalesPermissions.channelsRead) ? channels.refetch() : Promise.resolve(),
        hasPermission(FinancePermissions.cashAccountsRead) ? cashAccounts.refetch() : Promise.resolve(),
        hasPermission(FinancePermissions.bankAccountsRead) ? bankAccounts.refetch() : Promise.resolve(),
        hasPermission(IamPermissions.usersRead) ? users.refetch() : Promise.resolve(),
        hasPermission(LookupsPermissions.read) ? lists.refetch() : Promise.resolve(),
        hasPermission(IamPermissions.auditRead) ? audit.refetch() : Promise.resolve(),
      ])
    } catch (e) {
      console.warn('Dashboard refresh error:', e)
    } finally {
      setRefreshing(false)
    }
  }, [health, products, branches, channels, cashAccounts, bankAccounts, users, lists, audit, hasPermission])

  const counts = (
    [
      { icon: 'box', label: 'Ürün', n: products.data?.length ?? 0, show: hasPermission(InventoryPermissions.productsRead), tone: 'primary' },
      { icon: 'briefcase', label: 'Şube', n: branches.data?.length ?? 0, show: hasPermission(OrgPermissions.branchesRead), tone: 'info' },
      { icon: 'shopping-bag', label: 'Kanal', n: channels.data?.length ?? 0, show: hasPermission(SalesPermissions.channelsRead), tone: 'success' },
      { icon: 'credit-card', label: 'Kasa/Banka', n: (cashAccounts.data?.length ?? 0) + (bankAccounts.data?.length ?? 0), show: hasPermission(FinancePermissions.cashAccountsRead), tone: 'success' },
      { icon: 'users', label: 'Kullanıcı', n: users.data?.length ?? 0, show: hasPermission(IamPermissions.usersRead), tone: 'warning' },
      { icon: 'list', label: 'Liste', n: lists.data?.length ?? 0, show: hasPermission(LookupsPermissions.read), tone: 'info' },
    ] as CountTile[]
  ).filter((c) => c.show)

  const dist: Datum[] = counts.map((c) => ({ name: c.label, value: c.n })).filter((d) => d.value > 0)
  const recent = (audit.data?.items ?? []).map((a) => ({ id: a.id, title: `${a.entityType} ${ACTION_TR[a.action] ?? a.action}`, subtitle: a.userName ?? 'sistem', at: a.createdAt }))

  const greeting = user ? displayName(user).split(' ')[0] : ''

  // Quick actions logic
  interface QuickAction {
    icon: IconName
    label: string
    tone: 'primary' | 'success' | 'warning' | 'info'
    onPress: () => void
    show: boolean
  }

  const actions = (
    [
      {
        icon: 'shopping-bag',
        label: 'Satış Yap',
        tone: 'primary',
        onPress: () => enterModule('pos'),
        show: hasPermission(PosPermissions.sell) || hasPermission(PosPermissions.registersRead),
      },
      {
        icon: 'plus-circle',
        label: 'Ürün Ekle',
        tone: 'success',
        onPress: () => nav.navigate('inventory.products.form'),
        show: hasPermission(InventoryPermissions.productsWrite),
      },
      {
        icon: 'grid',
        label: 'Masa Düzeni',
        tone: 'info',
        onPress: () => nav.navigate('pos.floors'),
        show: hasPermission(PosPermissions.tablesManage),
      },
      {
        icon: 'briefcase',
        label: 'Şube Ekle',
        tone: 'warning',
        onPress: () => nav.navigate('org.branches.form'),
        show: hasPermission(OrgPermissions.branchesWrite),
      },
      {
        icon: 'user-plus',
        label: 'Cari Ekle',
        tone: 'success',
        onPress: () => nav.navigate('contacts.contacts.form'),
        show: hasPermission(ContactsPermissions.contactsWrite),
      },
      {
        icon: 'bar-chart-2',
        label: 'Analiz',
        tone: 'info',
        onPress: () => nav.switchTab('genel.analytics'),
        show: true,
      },
    ] as QuickAction[]
  ).filter((a) => a.show)

  return (
    <Screen
      header={{
        title: 'Genel Bakış',
        large: true,
        right: (
          <>
            <HeaderAction icon={theme.scheme === 'dark' ? 'sun' : 'moon'} onPress={toggle} />
            <ModuleSwitcherButton />
          </>
        ),
      }}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    >
      {/* Welcome Hero Banner */}
      <Card
        style={{
          padding: t.spacing[4],
          backgroundColor: t.scheme === 'dark' ? withAlpha(t.colors.primary, 0.12) : t.colors.primarySoft,
          borderColor: withAlpha(t.colors.primary, 0.25),
          borderWidth: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing[4],
          ...t.elevation('sm'),
        }}
      >
        {user ? <Avatar initials={initials(user)} size={48} tone="primary" /> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title" weight="bold" style={{ color: t.colors.primary }}>
            Hoş geldin, {greeting || 'Kullanıcı'} 👋
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: health.data?.status === 'ok' ? t.colors.success : health.loading ? t.colors.mutedForeground : t.colors.destructive,
              }}
            />
            <Text variant="caption" tone="muted">
              {health.loading ? 'Sistem kontrol ediliyor...' : health.data?.status === 'ok' ? 'Tüm sistemler çevrimiçi' : 'Sistem bağlantısı koptu'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Quick Actions horizontal bar */}
      {actions.length > 0 ? (
        <Section title="Hızlı İşlemler">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: t.spacing[4],
              paddingHorizontal: t.spacing[1],
              paddingVertical: t.spacing[1],
            }}
          >
            {actions.map((act, i) => {
              const color = {
                primary: t.colors.primary,
                success: t.colors.success,
                warning: t.colors.warning,
                info: t.colors.info,
              }[act.tone]
              return (
                <Pressable
                  key={act.label + i}
                  onPress={act.onPress}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    gap: t.spacing[1.5],
                    width: 76,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: t.radius.full,
                      backgroundColor: t.colors.surface,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={act.icon} size={20} color={color} />
                  </View>
                  <Text variant="caption" weight="medium" style={{ fontSize: 11, textAlign: 'center' }} numberOfLines={1}>
                    {act.label}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </Section>
      ) : null}

      {/* Cross-module counts */}
      {counts.length > 0 ? (
        <Section title="Genel Durum">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
            {counts.map((c) => (
              <View key={c.label} style={{ width: '46%', flexGrow: 1, flexDirection: 'row' }}>
                <StatCard icon={c.icon} label={c.label} value={String(c.n)} tone={c.tone} />
              </View>
            ))}
          </View>
        </Section>
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
