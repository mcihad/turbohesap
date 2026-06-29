import * as React from 'react'
import { Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HrPermissions } from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormSelect,
  HeaderAction,
  Icon,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  type SelectOption,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney, MONTH_LABELS, PAYROLL_RUN_STATUS_LABELS, PAYROLL_RUN_STATUS_TONES } from './format'

const now = new Date()
const YEAR_OPTIONS: SelectOption<string>[] = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => ({
  value: String(y),
  label: String(y),
}))
const MONTH_OPTIONS: SelectOption<string>[] = MONTH_LABELS.map((m, i) => ({ value: String(i + 1), label: m }))

export function PayrollScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canPayroll = hasPermission(HrPermissions.payroll)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const runs = useAsync(() => api.hr.payroll.listRuns(), [], { enabled: canRead })
  const list = runs.data ?? []

  return (
    <PermissionRequired
      permission={HrPermissions.read}
      title="Bordro"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Bordro',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canPayroll ? <HeaderAction icon="plus" onPress={() => setSheetOpen(true)} /> : undefined,
        }}
        onRefresh={runs.refetch}
        refreshing={runs.refreshing}
      >
        {runs.loading ? (
          <SkeletonRows count={5} />
        ) : runs.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={runs.error}
            actionLabel="Tekrar dene"
            onAction={runs.refetch}
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon="dollar-sign"
            title="Bordro dönemi yok"
            description="Henüz bordro dönemi oluşturulmamış."
            actionLabel={canPayroll ? 'Yeni dönem' : undefined}
            onAction={canPayroll ? () => setSheetOpen(true) : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {list.length} Dönem
            </Text>
            <ListCard>
              {list.map((r) => (
                <ListRow
                  key={r.id}
                  icon="dollar-sign"
                  title={`${MONTH_LABELS[r.month - 1]} ${r.year}`}
                  subtitle={`${r.payslipCount} pusula · Net ${formatMoney(r.totalNet)}`}
                  trailing={<Badge label={PAYROLL_RUN_STATUS_LABELS[r.status]} tone={PAYROLL_RUN_STATUS_TONES[r.status]} />}
                  onPress={() => nav.navigate('hr.payroll.detail', { id: r.id }, `${MONTH_LABELS[r.month - 1]} ${r.year}`)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>

      <CreateRunSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={(run) => {
          setSheetOpen(false)
          runs.refetch()
          nav.navigate('hr.payroll.detail', { id: run.id }, `${MONTH_LABELS[run.month - 1]} ${run.year}`)
        }}
      />
    </PermissionRequired>
  )
}

function CreateRunSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (run: { id: string; year: number; month: number }) => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { submit, busy } = useSubmit()
  const [year, setYear] = React.useState(String(now.getFullYear()))
  const [month, setMonth] = React.useState(String(now.getMonth() + 1))

  React.useEffect(() => {
    if (open) {
      setYear(String(now.getFullYear()))
      setMonth(String(now.getMonth() + 1))
    }
  }, [open])

  const create = () =>
    submit(async () => {
      const run = await api.hr.payroll.createRun({ year: Number(year), month: Number(month) })
      onCreated(run)
    })

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            paddingTop: t.spacing[3],
          }}
        >
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: t.spacing[5],
              paddingBottom: t.spacing[3],
            }}
          >
            <Text variant="title" weight="semibold">
              Yeni bordro dönemi
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: t.spacing[5], gap: t.spacing[3] }}>
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <FormSelect label="Yıl" value={year} options={YEAR_OPTIONS} onChange={setYear} />
              </View>
              <View style={{ flex: 1.4 }}>
                <FormSelect label="Ay" value={month} options={MONTH_OPTIONS} onChange={setMonth} />
              </View>
            </View>
          </View>

          <View
            style={{
              paddingHorizontal: t.spacing[5],
              paddingTop: t.spacing[4],
              paddingBottom: insets.bottom + t.spacing[3],
            }}
          >
            <Button title="Dönem oluştur" icon="check" fullWidth loading={busy} onPress={create} />
          </View>
        </View>
      </View>
    </Modal>
  )
}
