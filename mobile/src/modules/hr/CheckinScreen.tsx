// ★ CheckinScreen — the star of the PDKS feature: a personnel's self check-in/out
// surface. The device captures a foreground GPS fix and posts it to
// api.hr.attendance.checkin; the SERVER validates the geofence (allowed area +
// tolerance) and the shift time window, returning accepted/flagged plus a human
// message. We never decide acceptance on the client — we just show the result.
//
// Layout: today's shift card → two big "Giriş Yap" / "Çıkış Yap" buttons → the
// last result card (green when accepted, amber/red when flagged) → recent
// movements ("Son Hareketler"). Recent movements refetch after every check-in.
//
// NOTE: expo-location is a native module → the app must be a dev build
// (`npx expo prebuild` + a custom dev client), NOT plain Expo Go. This mirrors
// the expo-camera requirement of the Sayım (stocktake) scanner.

import * as React from 'react'
import { Platform, View } from 'react-native'
import * as Location from 'expo-location'

import {
  ATTENDANCE_DIRECTION_LABELS,
  ATTENDANCE_STATUS_LABELS,
  HrPermissions,
  type AttendanceDirection,
  type CheckinResultDto,
  type EmployeeShiftDayDto,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  PermissionRequired,
  Screen,
  Section,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDateTime, formatRelative } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

type LocPerm = 'checking' | 'granted' | 'denied'

// Local YYYY-MM-DD for "today" (shift schedule + record windows are date-keyed).
function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shiftLabel(day: EmployeeShiftDayDto | undefined): { title: string; time: string | null; color: string | null } {
  if (!day) return { title: 'Bugün vardiya yok', time: null, color: null }
  if (!day.shift || day.shift.isDayOff) return { title: 'İzin / OFF', time: null, color: null }
  return {
    title: day.shift.name,
    time: `${day.shift.startTime} – ${day.shift.endTime}`,
    color: day.shift.color || null,
  }
}

export function CheckinScreen() {
  const nav = useNav()
  const t = useTheme()
  const { hasPermission } = useAuth()
  const canCheckin = hasPermission(HrPermissions.attendanceCheckin)

  const [locPerm, setLocPerm] = React.useState<LocPerm>('checking')
  const [result, setResult] = React.useState<CheckinResultDto | null>(null)
  const { submit, busy } = useSubmit()

  const today = todayIso()
  const schedule = useAsync(() => api.hr.shiftSchedule.mine(today, today), [today], { enabled: canCheckin })
  const recent = useAsync(() => api.hr.attendance.mine(), [], { enabled: canCheckin })

  // Request foreground location permission on mount (mirrors CountScanScreen's
  // camera-permission gate). Re-runnable via the "Tekrar dene" button.
  const requestLocation = React.useCallback(async () => {
    setLocPerm('checking')
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setLocPerm(status === 'granted' ? 'granted' : 'denied')
    } catch {
      setLocPerm('denied')
    }
  }, [])

  React.useEffect(() => {
    if (canCheckin) void requestLocation()
  }, [canCheckin, requestLocation])

  const doCheckin = (direction: AttendanceDirection) => {
    void submit(
      async () => {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        const res = await api.hr.attendance.checkin({
          direction,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy ?? undefined,
          isMockLocation: pos.mocked ?? false,
          deviceInfo: { platform: Platform.OS, osVersion: String(Platform.Version) },
        })
        setResult(res)
        recent.refetch()
      },
      { errorTitle: 'Konum alınamadı' },
    )
  }

  const todayShift = shiftLabel(schedule.data?.[0])

  return (
    <PermissionRequired
      permission={HrPermissions.attendanceCheckin}
      title="Giriş / Çıkış"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{ title: 'Giriş / Çıkış', large: !nav.canGoBack, onBack: nav.canGoBack ? nav.goBack : undefined }}
        onRefresh={() => {
          schedule.refetch()
          recent.refetch()
        }}
        refreshing={schedule.refreshing || recent.refreshing}
      >
        {/* ── Today's shift ── */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: t.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: todayShift.color ?? t.colors.muted,
              }}
            >
              <Icon name="calendar" size={22} color={todayShift.color ? '#fff' : t.colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="overline" tone="muted">
                Bugünkü Vardiya
              </Text>
              {schedule.loading ? (
                <Text variant="body" tone="muted">
                  Yükleniyor…
                </Text>
              ) : (
                <>
                  <Text variant="title" weight="bold">
                    {todayShift.title}
                  </Text>
                  {todayShift.time ? (
                    <Text variant="caption" tone="muted">
                      {todayShift.time}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          </View>
        </Card>

        {/* ── Location permission gate / check-in buttons ── */}
        {locPerm === 'denied' ? (
          <Card>
            <View style={{ alignItems: 'center', gap: t.spacing[3], paddingVertical: t.spacing[2] }}>
              <Icon name="map-pin" size={40} color={t.colors.mutedForeground} />
              <Text variant="title" weight="bold" style={{ textAlign: 'center' }}>
                Konum izni gerekli
              </Text>
              <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
                Giriş/çıkış yapabilmek için konum erişimine izin verin. İzni reddettiyseniz cihaz ayarlarından açıp tekrar deneyin.
              </Text>
              <Button title="Tekrar dene" icon="refresh-cw" fullWidth onPress={() => void requestLocation()} />
            </View>
          </Card>
        ) : (
          <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Giriş Yap"
                icon="log-in"
                size="lg"
                fullWidth
                loading={busy}
                disabled={locPerm !== 'granted' || busy}
                onPress={() => doCheckin('in')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Çıkış Yap"
                icon="log-out"
                variant="secondary"
                size="lg"
                fullWidth
                loading={busy}
                disabled={locPerm !== 'granted' || busy}
                onPress={() => doCheckin('out')}
              />
            </View>
          </View>
        )}

        {busy ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            Konum alınıyor ve gönderiliyor…
          </Text>
        ) : null}

        {/* ── Last check-in result ── */}
        {result ? <ResultCard result={result} /> : null}

        {/* ── Recent movements ── */}
        <Section title="Son Hareketler">
          {recent.loading ? (
            <SkeletonRows count={4} />
          ) : recent.error ? (
            <EmptyState
              icon="alert-triangle"
              tone="destructive"
              title="Yüklenemedi"
              description={recent.error}
              actionLabel="Tekrar dene"
              onAction={() => recent.refetch()}
            />
          ) : (recent.data ?? []).length === 0 ? (
            <EmptyState icon="clock" title="Henüz hareket yok" description="İlk giriş/çıkışınız burada görünecek." />
          ) : (
            <View style={{ gap: t.spacing[2] }}>
              {(recent.data ?? []).map((r) => (
                <MovementRow key={r.id} record={r} />
              ))}
            </View>
          )}
        </Section>
      </Screen>
    </PermissionRequired>
  )
}

// Result of the most recent check-in. Green when the server accepted it; amber/
// red (flagged) when out of area or out of the time window, with the server's
// message + matched area + distance.
function ResultCard({ result }: { result: CheckinResultDto }) {
  const t = useTheme()
  const accepted = result.accepted
  const accent = accepted ? t.colors.success : t.colors.warning
  const { record } = result
  return (
    <Card>
      <View style={{ gap: t.spacing[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: accent,
            }}
          >
            <Icon name={accepted ? 'check' : 'alert-triangle'} size={16} color="#fff" />
          </View>
          <Text variant="title" weight="bold" style={{ flex: 1, color: accent }}>
            {accepted ? 'Kaydedildi' : 'İşaretlendi'}
          </Text>
          <Badge label={ATTENDANCE_DIRECTION_LABELS[record.direction]} tone={record.direction === 'in' ? 'success' : 'info'} />
        </View>
        <Text variant="body">{result.message}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] }}>
          {record.area ? <Badge label={record.area.name} tone="muted" /> : null}
          {record.distanceMeters != null ? (
            <Badge label={`${Math.round(record.distanceMeters)} m`} tone={record.withinGeofence ? 'success' : 'destructive'} />
          ) : null}
          <Badge label={ATTENDANCE_STATUS_LABELS[record.status]} tone={record.status === 'valid' ? 'success' : 'warning'} />
        </View>
        <Text variant="caption" tone="muted">
          {formatDateTime(record.eventTime)}
        </Text>
      </View>
    </Card>
  )
}

function MovementRow({ record }: { record: import('@turbohesap/shared').AttendanceRecordDto }) {
  const t = useTheme()
  const isIn = record.direction === 'in'
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: t.radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.colors.muted,
          }}
        >
          <Icon name={isIn ? 'log-in' : 'log-out'} size={18} color={t.colors.foreground} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
            <Text variant="body" weight="semibold">
              {ATTENDANCE_DIRECTION_LABELS[record.direction]}
            </Text>
            <Badge
              label={ATTENDANCE_STATUS_LABELS[record.status]}
              tone={record.status === 'valid' ? 'success' : record.status === 'flagged' ? 'warning' : 'destructive'}
            />
          </View>
          <Text variant="caption" tone="muted">
            {formatDateTime(record.eventTime)}
            {record.area ? ` · ${record.area.name}` : ''}
          </Text>
        </View>
        <Text variant="caption" tone="muted">
          {formatRelative(record.eventTime)}
        </Text>
      </View>
    </Card>
  )
}
