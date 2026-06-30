// MyScheduleScreen — a personnel's own upcoming shift calendar (Vardiyalarım).
// Lists materialized shift days from api.hr.shiftSchedule.mine(from, to) for the
// next two weeks (today → +14 days), one row per day: Turkish weekday + date and
// the shift name + start–end with the shift's color as a left accent, or
// "İzin / OFF" when the day has no shift.

import * as React from 'react'
import { View } from 'react-native'

import { HrPermissions, type EmployeeShiftDayDto } from '@turbohesap/shared'

import { Badge, EmptyState, PermissionRequired, Screen, SkeletonRows, Text } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const RANGE_DAYS = 14

function isoOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayLabel(iso: string): { weekday: string; date: string; isToday: boolean } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { weekday: '', date: iso, isToday: false }
  const weekday = d.toLocaleDateString('tr-TR', { weekday: 'long' })
  const date = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' })
  const today = new Date()
  const isToday =
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  return { weekday, date, isToday }
}

export function MyScheduleScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.attendanceCheckin)

  const from = isoOffset(0)
  const to = isoOffset(RANGE_DAYS)
  const schedule = useAsync(() => api.hr.shiftSchedule.mine(from, to), [from, to], { enabled: canRead })

  const days = React.useMemo(
    () => [...(schedule.data ?? [])].sort((a, b) => a.workDate.localeCompare(b.workDate)),
    [schedule.data],
  )

  return (
    <PermissionRequired
      permission={HrPermissions.attendanceCheckin}
      title="Vardiyalarım"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{ title: 'Vardiyalarım', large: !nav.canGoBack, onBack: nav.canGoBack ? nav.goBack : undefined }}
        onRefresh={() => schedule.refetch()}
        refreshing={schedule.refreshing}
      >
        {schedule.loading ? (
          <SkeletonRows count={6} />
        ) : schedule.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={schedule.error}
            actionLabel="Tekrar dene"
            onAction={() => schedule.refetch()}
          />
        ) : days.length === 0 ? (
          <EmptyState icon="calendar" title="Vardiya yok" description="Önümüzdeki 2 hafta için planlanmış vardiyanız bulunmuyor." />
        ) : (
          <View style={{ gap: 10 }}>
            {days.map((d) => (
              <ScheduleRow key={d.id} day={d} />
            ))}
          </View>
        )}
      </Screen>
    </PermissionRequired>
  )
}

function ScheduleRow({ day }: { day: EmployeeShiftDayDto }) {
  const t = useTheme()
  const { weekday, date, isToday } = formatDayLabel(day.workDate)
  const off = !day.shift || day.shift.isDayOff
  const accent = off ? t.colors.border : day.shift?.color || t.colors.primary

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[3],
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: isToday ? t.colors.primary : t.colors.border,
        backgroundColor: t.colors.card,
        overflow: 'hidden',
      }}
    >
      {/* Color accent strip (data-driven shift color is allowed) */}
      <View style={{ width: 5, alignSelf: 'stretch', backgroundColor: accent }} />

      <View style={{ flex: 1, paddingVertical: t.spacing[3], paddingRight: t.spacing[3], gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
          <Text variant="body" weight="semibold" style={{ textTransform: 'capitalize' }}>
            {weekday}
          </Text>
          {isToday ? <Badge label="Bugün" tone="primary" /> : null}
        </View>
        <Text variant="caption" tone="muted">
          {date}
        </Text>
      </View>

      <View style={{ paddingVertical: t.spacing[3], paddingRight: t.spacing[3.5], alignItems: 'flex-end' }}>
        {off ? (
          <Text variant="body" weight="semibold" tone="muted">
            İzin / OFF
          </Text>
        ) : (
          <>
            <Text variant="body" weight="semibold">
              {day.shift?.name}
            </Text>
            <Text variant="caption" tone="muted">
              {day.shift?.startTime} – {day.shift?.endTime}
            </Text>
          </>
        )}
      </View>
    </View>
  )
}
