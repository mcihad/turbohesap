// Kalite kontrol — pass/fail kayıtları listesi (result filtre çipleri) + bir
// "+" kayıt sheet'i. Kayıt bir Üretim Emrine bağlanır (opsiyonel operasyon türü),
// geçti/kaldı sonucu ve kontrol/geçen/ret miktarlarıyla. Listeyi görmek read,
// kayıt production.quality.manage ister. Mirrors the orders list shell + the
// stocktake CreateCountSheet modal.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ProductionPermissions,
  type QualityCheckResult,
  type QualityCheckType,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  EmptyState,
  FormSelect,
  HeaderAction,
  Icon,
  Input,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SegmentedControl,
  type SegmentOption,
  type SelectOption,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { QUALITY_RESULT_LABELS, QUALITY_RESULT_TONES, QUALITY_TYPE_LABELS, formatQty } from './format'

type ResultFilter = 'all' | QualityCheckResult

export function QualityScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canManage = hasPermission(ProductionPermissions.qualityManage)
  const [filter, setFilter] = React.useState<ResultFilter>('all')
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const checks = useAsync(() => api.production.qualityChecks.list(), [], { enabled: canRead })
  const list = checks.data ?? []

  const resultFilters = React.useMemo<ResultFilter[]>(() => {
    const present: QualityCheckResult[] = []
    for (const c of list) if (!present.includes(c.result)) present.push(c.result)
    return ['all', ...present]
  }, [list])

  const filtered = React.useMemo(
    () => (filter === 'all' ? list : list.filter((c) => c.result === filter)),
    [list, filter],
  )

  return (
    <PermissionRequired
      permission={ProductionPermissions.read}
      title="Kalite"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Kalite',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canManage ? <HeaderAction icon="plus" onPress={() => setSheetOpen(true)} /> : undefined,
        }}
        onRefresh={checks.refetch}
        refreshing={checks.refreshing}
      >
        {resultFilters.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.spacing[2], paddingHorizontal: t.spacing[0.5] }}
          >
            {resultFilters.map((s) => {
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
                    {s === 'all' ? 'Tümü' : QUALITY_RESULT_LABELS[s]}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}

        {checks.loading ? (
          <SkeletonRows count={6} />
        ) : checks.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={checks.error}
            actionLabel="Tekrar dene"
            onAction={checks.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title="Kalite kaydı yok"
            description={filter === 'all' ? 'Henüz kalite kontrol kaydı yok.' : 'Bu sonuçta kayıt yok.'}
            actionLabel={canManage && filter === 'all' ? 'Kalite Kaydet' : undefined}
            onAction={canManage && filter === 'all' ? () => setSheetOpen(true) : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Kayıt
            </Text>
            <ListCard>
              {filtered.map((c) => (
                <ListRow
                  key={c.id}
                  icon={c.result === 'pass' ? 'check-circle' : 'x-circle'}
                  iconTone={c.result === 'pass' ? 'primary' : 'muted'}
                  title={c.manufacturingOrderNo}
                  subtitle={`${QUALITY_TYPE_LABELS[c.checkType]} · Kontrol ${formatQty(c.inspectedQuantity)} · Geçen ${formatQty(c.passedQuantity)} · Ret ${formatQty(c.rejectedQuantity)} · ${formatDate(c.checkedAt)}`}
                  trailing={<Badge label={QUALITY_RESULT_LABELS[c.result]} tone={QUALITY_RESULT_TONES[c.result]} />}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>

      {sheetOpen ? (
        <RecordSheet
          onClose={() => setSheetOpen(false)}
          onDone={() => {
            setSheetOpen(false)
            checks.refetch()
          }}
        />
      ) : null}
    </PermissionRequired>
  )
}

const RESULT_OPTIONS: SegmentOption<QualityCheckResult>[] = [
  { value: 'pass', label: 'Geçti' },
  { value: 'fail', label: 'Kaldı' },
]
const TYPE_OPTIONS: SelectOption<QualityCheckType>[] = (
  ['operation', 'final', 'incoming'] as QualityCheckType[]
).map((v) => ({ value: v, label: QUALITY_TYPE_LABELS[v] }))

function RecordSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { submit, busy } = useSubmit()

  const orders = useAsync(() => api.production.orders.list(), [])

  const [manufacturingOrderId, setManufacturingOrderId] = React.useState('')
  const [checkType, setCheckType] = React.useState<QualityCheckType>('final')
  const [result, setResult] = React.useState<QualityCheckResult>('pass')
  const [inspected, setInspected] = React.useState('0')
  const [passed, setPassed] = React.useState('0')
  const [rejected, setRejected] = React.useState('0')
  const [notes, setNotes] = React.useState('')

  const orderOptions = React.useMemo<SelectOption<string>[]>(
    () => [
      { value: '', label: 'Üretim emri seçin' },
      ...(orders.data ?? []).map((o) => ({ value: o.id, label: `${o.orderNo} · ${o.productName}` })),
    ],
    [orders.data],
  )

  const record = () => {
    if (!manufacturingOrderId) {
      alert('Üretim emri seçilmelidir')
      return
    }
    void submit(
      async () => {
        await api.production.qualityChecks.record({
          manufacturingOrderId,
          checkType,
          result,
          inspectedQuantity: Number(inspected) || 0,
          passedQuantity: Number(passed) || 0,
          rejectedQuantity: Number(rejected) || 0,
          notes: notes.trim() || null,
        })
        onDone()
      },
      { errorTitle: 'Kalite kaydı başarısız' },
    )
  }

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
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.spacing[4], paddingVertical: t.spacing[3] }}>
            <Text variant="title" weight="bold" style={{ flex: 1 }}>
              Kalite Kaydet
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={24} color={t.colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: insets.bottom + t.spacing[4], gap: t.spacing[4] }}>
            <FormSelect label="Üretim Emri" value={manufacturingOrderId} options={orderOptions} onChange={setManufacturingOrderId} />
            <FormSelect label="Kontrol Türü" value={checkType} options={TYPE_OPTIONS} onChange={setCheckType} />
            <SegmentedControl options={RESULT_OPTIONS} value={result} onChange={setResult} />
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Input label="Kontrol Edilen" keyboardType="numeric" value={inspected} onChangeText={setInspected} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Geçen" keyboardType="numeric" value={passed} onChangeText={setPassed} />
              </View>
            </View>
            <Input label="Reddedilen" keyboardType="numeric" value={rejected} onChangeText={setRejected} />
            <Input label="Not (opsiyonel)" value={notes} onChangeText={setNotes} />
            <Button title="Kaydet" icon="check" fullWidth loading={busy} onPress={record} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
