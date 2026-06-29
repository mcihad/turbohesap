// Sayım listesi — count sessions with status filter chips and a "+" create sheet.
// Mirrors the orders list shell (chips + ListCard rows), tapping a row drills into
// the detail screen. The create sheet collects kind/branch/blind/threshold and,
// for a partial count, an optional category scope.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import {
  STOCK_COUNT_KIND_LABELS,
  STOCK_COUNT_STATUS_LABELS,
  STOCK_COUNT_KINDS,
  StocktakePermissions,
  type CreateStockCountRequest,
  type StockCountKind,
  type StockCountStatus,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  Checklist,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  HeaderAction,
  Icon,
  Input,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  Section,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { KIND_ICONS, STATUS_TONES } from './format'

type StatusFilter = 'all' | StockCountStatus

export function StockCountListScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(StocktakePermissions.read)
  const canCreate = hasPermission(StocktakePermissions.create)
  const [filter, setFilter] = React.useState<StatusFilter>('all')
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const counts = useAsync(() => api.stocktake.list(), [], { enabled: canRead })
  const list = counts.data ?? []

  // Surface only the status chips present in the loaded data (+ "all").
  const statusFilters = React.useMemo<StatusFilter[]>(() => {
    const present: StockCountStatus[] = []
    for (const c of list) if (!present.includes(c.status)) present.push(c.status)
    return ['all', ...present]
  }, [list])

  const filtered = React.useMemo(
    () => (filter === 'all' ? list : list.filter((c) => c.status === filter)),
    [list, filter],
  )

  return (
    <PermissionRequired
      permission={StocktakePermissions.read}
      title="Sayımlar"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Sayımlar',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canCreate ? <HeaderAction icon="plus" onPress={() => setSheetOpen(true)} /> : undefined,
        }}
        onRefresh={counts.refetch}
        refreshing={counts.refreshing}
      >
        {statusFilters.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.spacing[2], paddingHorizontal: t.spacing[0.5] }}
          >
            {statusFilters.map((s) => {
              const active = s === filter
              return (
                <Pressable
                  key={s}
                  onPress={() => setFilter(s)}
                  style={{
                    paddingHorizontal: t.spacing[3],
                    paddingVertical: t.spacing[1.5],
                    borderRadius: t.radius.full,
                    borderWidth: 1,
                    borderColor: active ? t.colors.primary : t.colors.border,
                    backgroundColor: active ? t.colors.primary : 'transparent',
                  }}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={{ color: active ? t.colors.primaryForeground : t.colors.mutedForeground }}
                  >
                    {s === 'all' ? 'Tümü' : STOCK_COUNT_STATUS_LABELS[s]}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}

        {counts.loading ? (
          <SkeletonRows count={6} />
        ) : counts.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={counts.error}
            actionLabel="Tekrar dene"
            onAction={counts.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="maximize"
            title="Sayım bulunamadı"
            description={filter === 'all' ? 'Henüz sayım oluşturulmamış.' : 'Bu durumda sayım yok.'}
            actionLabel={canCreate && filter === 'all' ? 'Yeni sayım' : undefined}
            onAction={canCreate && filter === 'all' ? () => setSheetOpen(true) : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Sayım
            </Text>
            <ListCard>
              {filtered.map((c) => {
                const progress = c.lineCount > 0 ? Math.round((c.countedCount / c.lineCount) * 100) : 0
                return (
                  <ListRow
                    key={c.id}
                    icon={KIND_ICONS[c.kind]}
                    title={c.name || STOCK_COUNT_KIND_LABELS[c.kind]}
                    subtitle={`${STOCK_COUNT_KIND_LABELS[c.kind]} · ${c.branchName ?? 'Tüm şubeler'} · ${c.countedCount}/${c.lineCount} (%${progress})`}
                    trailing={
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Badge label={STOCK_COUNT_STATUS_LABELS[c.status]} tone={STATUS_TONES[c.status]} />
                        {c.varianceCount > 0 ? (
                          <Text variant="caption" tone="muted">
                            {c.varianceCount} fark
                          </Text>
                        ) : null}
                      </View>
                    }
                    onPress={() => nav.navigate('stocktake.detail', { id: c.id }, c.name || 'Sayım')}
                  />
                )
              })}
            </ListCard>
          </>
        )}
      </Screen>

      {sheetOpen ? (
        <CreateCountSheet
          onClose={() => setSheetOpen(false)}
          onCreated={(id) => {
            setSheetOpen(false)
            counts.refetch()
            nav.navigate('stocktake.detail', { id }, 'Sayım')
          }}
        />
      ) : null}
    </PermissionRequired>
  )
}

// ── Create sheet ──────────────────────────────────────────────────────────
function CreateCountSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const t = useTheme()
  const { submit, busy } = useSubmit()

  const branches = useAsync(() => api.org.branches.list(), [])
  const categories = useAsync(() => api.inventory.categories.list(), [])

  const [kind, setKind] = React.useState<StockCountKind>('full')
  const [branchId, setBranchId] = React.useState<string>('')
  const [blind, setBlind] = React.useState(false)
  const [threshold, setThreshold] = React.useState('5')
  const [name, setName] = React.useState('')
  const [scopeCategoryIds, setScopeCategoryIds] = React.useState<string[]>([])

  const branchOptions = React.useMemo(
    () => [
      { value: '', label: 'Tüm şubeler' },
      ...(branches.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name })),
    ],
    [branches.data],
  )

  const create = () =>
    void submit(
      async () => {
        const body: CreateStockCountRequest = {
          kind,
          branchId: branchId || null,
          blind,
          name: name.trim() || undefined,
          recountThresholdPct: Number.isFinite(Number(threshold)) ? Number(threshold) : 5,
        }
        if (kind === 'partial' && scopeCategoryIds.length > 0) body.scopeCategoryIds = scopeCategoryIds
        const created = await api.stocktake.create(body)
        onCreated(created.id)
      },
      { errorTitle: 'Sayım oluşturulamadı' },
    )

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            maxHeight: '90%',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: t.spacing[3] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: t.spacing[4],
              paddingVertical: t.spacing[3],
            }}
          >
            <Text variant="title" weight="bold" style={{ flex: 1 }}>
              Yeni Sayım
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={24} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[4], gap: t.spacing[4] }}
          >
            <Input label="Ad (opsiyonel)" placeholder="örn. Ocak Tam Sayımı" value={name} onChangeText={setName} />

            <FormSelect
              label="Tür"
              value={kind}
              options={STOCK_COUNT_KINDS.map((k) => ({ value: k, label: STOCK_COUNT_KIND_LABELS[k] }))}
              onChange={setKind}
            />

            <FormSelect label="Şube" value={branchId} options={branchOptions} onChange={setBranchId} />

            <FormSwitchRow
              label="Kör sayım"
              description="Sayan kişi beklenen miktarı görmez (doğrulama yanlılığını azaltır)."
              value={blind}
              onValueChange={setBlind}
            />

            <Input
              label="Yeniden sayım eşiği (%)"
              placeholder="5"
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="numeric"
            />

            {kind === 'partial' ? (
              <Section title="Kapsam (opsiyonel)">
                <Checklist
                  label="Kategoriler"
                  searchable
                  items={(categories.data ?? []).map((c) => ({ id: c.id, title: c.name }))}
                  selected={scopeCategoryIds}
                  onToggle={(id, on) =>
                    setScopeCategoryIds((cur) => (on ? [...cur, id] : cur.filter((x) => x !== id)))
                  }
                  emptyText="Kategori yok"
                />
              </Section>
            ) : null}

            <Button title="Sayım Oluştur" icon="check" fullWidth loading={busy} onPress={create} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
