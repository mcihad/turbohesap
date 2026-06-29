import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  HrPermissions,
  LEAVE_STATUSES,
  type LeaveStatus,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormTextArea,
  HeaderAction,
  Icon,
  ListCard,
  PermissionRequired,
  Screen,
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
import { LEAVE_STATUS_LABELS, LEAVE_STATUS_TONES } from './format'

type StatusFilter = 'all' | LeaveStatus

/** Inclusive day count between two ISO dates. */
function dayCount(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  const ms = e.setHours(0, 0, 0, 0) - s.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor(ms / 86400000) + 1)
}

export function LeavesScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canWrite = hasPermission(HrPermissions.write)
  const canApprove = hasPermission(HrPermissions.approve)
  const [filter, setFilter] = React.useState<StatusFilter>('all')
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const requests = useAsync(() => api.hr.leaveRequests.list(), [], { enabled: canRead })
  const { submit, busy } = useSubmit()

  const list = requests.data ?? []
  const filtered = React.useMemo(
    () => (filter === 'all' ? list : list.filter((r) => r.status === filter)),
    [list, filter],
  )

  const statusFilters: StatusFilter[] = ['all', ...LEAVE_STATUSES]

  const decide = (id: string, approve: boolean) =>
    submit(async () => {
      if (approve) await api.hr.leaveRequests.approve(id)
      else await api.hr.leaveRequests.reject(id)
      requests.refetch()
    })

  return (
    <PermissionRequired
      permission={HrPermissions.read}
      title="İzinler"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'İzinler',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? <HeaderAction icon="plus" onPress={() => setSheetOpen(true)} /> : undefined,
        }}
        onRefresh={requests.refetch}
        refreshing={requests.refreshing}
      >
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
                  {s === 'all' ? 'Tümü' : LEAVE_STATUS_LABELS[s]}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {requests.loading ? (
          <SkeletonRows count={6} />
        ) : requests.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={requests.error}
            actionLabel="Tekrar dene"
            onAction={requests.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="İzin talebi yok"
            description={filter === 'all' ? 'Henüz izin talebi oluşturulmamış.' : 'Bu durumda talep bulunamadı.'}
            actionLabel={canWrite && filter === 'all' ? 'Yeni izin talebi' : undefined}
            onAction={canWrite && filter === 'all' ? () => setSheetOpen(true) : undefined}
          />
        ) : (
          <View style={{ gap: t.spacing[3] }}>
            {filtered.map((r) => (
              <Card key={r.id}>
                <View style={{ gap: t.spacing[3] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="label" weight="semibold">
                        {r.employeeName}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {r.leaveTypeName} · {r.days} gün
                      </Text>
                    </View>
                    <Badge label={LEAVE_STATUS_LABELS[r.status]} tone={LEAVE_STATUS_TONES[r.status]} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                    <Icon name="calendar" size={14} color={t.colors.mutedForeground} />
                    <Text variant="caption" tone="muted">
                      {formatDate(r.startDate)} → {formatDate(r.endDate)}
                    </Text>
                  </View>
                  {r.reason ? (
                    <Text variant="caption" tone="muted">
                      {r.reason}
                    </Text>
                  ) : null}
                  {canApprove && r.status === 'pending' ? (
                    <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                      <View style={{ flex: 1 }}>
                        <Button title="Reddet" variant="outline" icon="x" fullWidth loading={busy} onPress={() => decide(r.id, false)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button title="Onayla" icon="check" fullWidth loading={busy} onPress={() => decide(r.id, true)} />
                      </View>
                    </View>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        )}
      </Screen>

      <CreateLeaveSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={() => {
          setSheetOpen(false)
          requests.refetch()
        }}
      />
    </PermissionRequired>
  )
}

function CreateLeaveSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { submit, busy } = useSubmit()

  const employees = useAsync(() => api.hr.employees.list({ isActive: true }), [], { enabled: open })
  const leaveTypes = useAsync(() => api.hr.leaveTypes.list(), [], { enabled: open })

  const [employeeId, setEmployeeId] = React.useState('')
  const [leaveTypeId, setLeaveTypeId] = React.useState('')
  const [startDate, setStartDate] = React.useState(() => new Date().toISOString())
  const [endDate, setEndDate] = React.useState(() => new Date().toISOString())
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setEmployeeId('')
      setLeaveTypeId('')
      setStartDate(new Date().toISOString())
      setEndDate(new Date().toISOString())
      setReason('')
    }
  }, [open])

  const employeeOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'Personel seçin' }, ...(employees.data ?? []).map((e) => ({ value: e.id, label: e.fullName }))],
    [employees.data],
  )
  const leaveTypeOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'İzin türü seçin' }, ...(leaveTypes.data ?? []).map((l) => ({ value: l.id, label: l.name }))],
    [leaveTypes.data],
  )

  const days = dayCount(startDate, endDate)

  const create = () => {
    if (!employeeId) {
      alert('Personel seçilmelidir')
      return
    }
    if (!leaveTypeId) {
      alert('İzin türü seçilmelidir')
      return
    }
    if (days <= 0) {
      alert('Bitiş tarihi başlangıçtan önce olamaz')
      return
    }
    submit(async () => {
      await api.hr.leaveRequests.create({
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        days,
        reason: reason.trim() || null,
      })
      onCreated()
    })
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            maxHeight: '92%',
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
              paddingBottom: t.spacing[2],
            }}
          >
            <Text variant="title" weight="semibold">
              Yeni izin talebi
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[4], gap: t.spacing[3] }}>
            <FormSelect label="Personel" value={employeeId} options={employeeOptions} onChange={setEmployeeId} />
            <FormSelect label="İzin Türü" value={leaveTypeId} options={leaveTypeOptions} onChange={setLeaveTypeId} />
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <FormDatePicker label="Başlangıç" value={startDate} onChange={setStartDate} mode="date" />
              </View>
              <View style={{ flex: 1 }}>
                <FormDatePicker label="Bitiş" value={endDate} onChange={setEndDate} mode="date" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="label" tone="muted" weight="medium">
                Toplam gün
              </Text>
              <Badge label={`${days} gün`} tone="primary" />
            </View>
            <FormTextArea label="Açıklama" placeholder="İzin nedeni (opsiyonel)" value={reason} onChangeText={setReason} />
          </ScrollView>

          <View
            style={{
              paddingHorizontal: t.spacing[5],
              paddingTop: t.spacing[3],
              paddingBottom: insets.bottom + t.spacing[3],
              borderTopWidth: 1,
              borderTopColor: t.colors.border,
            }}
          >
            <Button title="Talep oluştur" icon="check" fullWidth loading={busy} onPress={create} />
          </View>
        </View>
      </View>
    </Modal>
  )
}
