// ★ İş Emri Saha Terminali — the shop-floor star. A big, glanceable status hero
// with large Başlat / Duraklat / Devam Et / Bitir buttons driven by the work-order
// lifecycle (ready→in_progress→paused→done). Finishing opens a sheet for üretilen/
// reddedilen miktar. A barcode scanner (reusing the Sayım CountScanScreen
// expo-camera pattern) lets the operator doğrula the component/product being
// reported — each scan is resolved via inventory.products.byBarcode with instant
// vibration + colour-flash feedback. When the operation qualityCheckRequired, a
// Kalite Kaydet action records a pass/fail check (the backend blocks Bitir without
// a passing record). All actions gate on production.workorders.execute; quality on
// production.quality.manage.

import * as React from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Vibration,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import {
  ProductionPermissions,
  toApiError,
  type BarcodeMatchDto,
  type QualityCheckResult,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  HeaderAction,
  Icon,
  Input,
  ListCard,
  ListRow,
  Screen,
  Section,
  SegmentedControl,
  type SegmentOption,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDateTime } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { WO_STATUS_TONES, WORK_ORDER_STATUS_LABELS, formatQty } from './format'

const SCAN_TYPES = ['ean13', 'ean8', 'code128', 'qr', 'upc_a', 'code39'] as const
const SAME_CODE_MS = 1200

interface ScanRow {
  key: string
  name: string
  code: string
  ok: boolean
  at: number
}

export function WorkOrderTerminalScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canExecute = hasPermission(ProductionPermissions.workordersExecute)
  const canQuality = hasPermission(ProductionPermissions.qualityManage)

  const id = String(nav.current.params?.id ?? '')
  const wo = useAsync(() => api.production.workOrders.get(id), [id], { enabled: canRead && !!id })
  const { submit, busy } = useSubmit()

  const [scanOpen, setScanOpen] = React.useState(false)
  const [finishOpen, setFinishOpen] = React.useState(false)
  const [qualityOpen, setQualityOpen] = React.useState(false)
  const [scans, setScans] = React.useState<ScanRow[]>([])

  const doc = wo.data

  const handleStart = () =>
    void submit(
      async () => {
        await api.production.workOrders.start(id)
        wo.refetch()
      },
      { errorTitle: 'Başlatılamadı' },
    )
  const handlePause = () =>
    void submit(
      async () => {
        await api.production.workOrders.pause(id)
        wo.refetch()
      },
      { errorTitle: 'Duraklatılamadı' },
    )
  const handleResume = () =>
    void submit(
      async () => {
        await api.production.workOrders.resume(id)
        wo.refetch()
      },
      { errorTitle: 'Devam ettirilemedi' },
    )

  if (!canRead) {
    return (
      <Screen header={{ title: 'İş Emri', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  const isReady = doc?.status === 'ready'
  const isInProgress = doc?.status === 'in_progress'
  const isPaused = doc?.status === 'paused'
  const isPending = doc?.status === 'pending'
  const isDone = doc?.status === 'done'

  const showStart = !!doc && canExecute && isReady
  const showPause = !!doc && canExecute && isInProgress
  const showResume = !!doc && canExecute && isPaused
  const showFinish = !!doc && canExecute && (isInProgress || isPaused)
  const showQuality = !!doc && canQuality && doc.qualityCheckRequired && !isDone && (isInProgress || isPaused)
  const hasActions = showStart || showPause || showResume || showFinish

  return (
    <Screen
      header={{
        title: doc ? `${doc.sequence}. ${doc.name}` : 'İş Emri',
        subtitle: doc ? `${doc.manufacturingOrderNo} · ${doc.workCenterName}` : undefined,
        onBack: nav.goBack,
        right: doc ? (
          <HeaderAction
            icon="clipboard"
            onPress={() => nav.navigate('production.order.detail', { id: doc.manufacturingOrderId }, doc.manufacturingOrderNo)}
          />
        ) : undefined,
      }}
      onRefresh={wo.refetch}
      refreshing={wo.refreshing}
      footer={
        doc && hasActions ? (
          <View style={{ gap: t.spacing[2.5] }}>
            {showStart ? (
              <Button title="Başlat" icon="play" size="lg" fullWidth loading={busy} onPress={handleStart} />
            ) : null}
            {showPause || showResume ? (
              <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                {showResume ? (
                  <View style={{ flex: 1 }}>
                    <Button title="Devam Et" icon="play" size="lg" fullWidth loading={busy} onPress={handleResume} />
                  </View>
                ) : null}
                {showPause ? (
                  <View style={{ flex: 1 }}>
                    <Button title="Duraklat" icon="pause" size="lg" variant="outline" fullWidth loading={busy} onPress={handlePause} />
                  </View>
                ) : null}
                {showFinish ? (
                  <View style={{ flex: 1 }}>
                    <Button title="Bitir" icon="check" size="lg" fullWidth loading={busy} onPress={() => setFinishOpen(true)} />
                  </View>
                ) : null}
              </View>
            ) : showFinish ? (
              <Button title="Bitir" icon="check" size="lg" fullWidth loading={busy} onPress={() => setFinishOpen(true)} />
            ) : null}
            {showQuality ? (
              <Button title="Kalite Kaydet" icon="check-circle" variant="secondary" fullWidth loading={busy} onPress={() => setQualityOpen(true)} />
            ) : null}
          </View>
        ) : undefined
      }
    >
      {wo.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={26} />
          </View>
        </Card>
      ) : wo.error || !doc ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={wo.error ?? 'İş emri bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={wo.refetch}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  İş Emri
                </Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {doc.qualityCheckRequired ? <Badge label="Kalite" tone="warning" /> : null}
                  <Badge label={WORK_ORDER_STATUS_LABELS[doc.status]} tone={WO_STATUS_TONES[doc.status]} />
                </View>
              </View>
              <Text variant="h1">{doc.productName}</Text>
              <Text variant="display" style={{ fontFamily: 'monospace' }}>
                {formatQty(doc.producedQuantity)}/{formatQty(doc.plannedQuantity)} {doc.unit}
              </Text>
              <Text variant="caption" tone="muted">
                {doc.workCenterName}
                {doc.rejectedQuantity > 0 ? ` · ${formatQty(doc.rejectedQuantity)} ret` : ''}
                {doc.actualMinutes > 0 ? ` · ${Math.round(doc.actualMinutes)} dk` : ''}
              </Text>
            </View>
          </Card>

          {isPending ? (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                <Icon name="clock" size={18} color={t.colors.mutedForeground} />
                <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                  Bu iş emri henüz hazır değil — önceki operasyonun tamamlanması bekleniyor.
                </Text>
              </View>
            </Card>
          ) : null}

          {/* Barkod doğrulama */}
          {canExecute && !isDone ? (
            <Section
              title="Barkod Doğrula"
              action={<Button title="Tara" icon="camera" size="sm" variant="ghost" onPress={() => setScanOpen(true)} />}
            >
              {scans.length === 0 ? (
                <Pressable onPress={() => setScanOpen(true)}>
                  <Card>
                    <View style={{ alignItems: 'center', gap: t.spacing[2], paddingVertical: t.spacing[4] }}>
                      <Icon name="maximize" size={26} color={t.colors.mutedForeground} />
                      <Text tone="muted" variant="caption">
                        Raporlanan malzemeyi doğrulamak için barkod tara
                      </Text>
                    </View>
                  </Card>
                </Pressable>
              ) : (
                <ListCard>
                  {scans.map((s) => (
                    <ListRow
                      key={s.key}
                      icon={s.ok ? 'check-circle' : 'x-circle'}
                      iconTone={s.ok ? 'primary' : 'muted'}
                      title={s.name}
                      subtitle={s.code}
                      trailing={<Badge label={s.ok ? 'Eşleşti' : 'Bulunamadı'} tone={s.ok ? 'success' : 'destructive'} />}
                    />
                  ))}
                </ListCard>
              )}
            </Section>
          ) : null}

          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Ürün" value={doc.productName} full />
                <Field label="Operasyon" value={`${doc.sequence}. ${doc.name}`} />
                <Field label="İş Merkezi" value={doc.workCenterName} />
                <Field label="Planlanan" value={`${formatQty(doc.plannedQuantity)} ${doc.unit}`} />
                <Field label="Üretilen" value={`${formatQty(doc.producedQuantity)} ${doc.unit}`} />
                <Field label="Planlı Süre" value={`${Math.round(doc.plannedSetupMinutes + doc.plannedRunMinutes)} dk`} />
                <Field label="Gerçek Süre" value={`${Math.round(doc.actualMinutes)} dk`} />
                {doc.startedAt ? <Field label="Başlangıç" value={formatDateTime(doc.startedAt)} /> : null}
                {doc.finishedAt ? <Field label="Bitiş" value={formatDateTime(doc.finishedAt)} /> : null}
                {doc.notes ? <Field label="Notlar" value={doc.notes} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          {doc.timeLogs.length > 0 ? (
            <Section title={`Zaman Kayıtları (${doc.timeLogs.length})`}>
              <ListCard>
                {doc.timeLogs.map((log) => (
                  <ListRow
                    key={log.id}
                    icon="clock"
                    title={`${Math.round(log.durationMinutes)} dk`}
                    subtitle={`${formatDateTime(log.startedAt)}${log.endedAt ? ` → ${formatDateTime(log.endedAt)}` : ' → devam ediyor'}`}
                  />
                ))}
              </ListCard>
            </Section>
          ) : null}
        </>
      )}

      {scanOpen ? (
        <ScanModal
          onClose={() => setScanOpen(false)}
          onScan={(row) => setScans((cur) => [row, ...cur].slice(0, 30))}
        />
      ) : null}

      {finishOpen && doc ? (
        <FinishSheet
          id={id}
          plannedQuantity={doc.plannedQuantity}
          unit={doc.unit}
          submit={submit}
          busy={busy}
          onClose={() => setFinishOpen(false)}
          onDone={() => {
            setFinishOpen(false)
            wo.refetch()
          }}
        />
      ) : null}

      {qualityOpen && doc ? (
        <QualitySheet
          manufacturingOrderId={doc.manufacturingOrderId}
          workOrderId={doc.id}
          plannedQuantity={doc.plannedQuantity}
          submit={submit}
          busy={busy}
          onClose={() => setQualityOpen(false)}
          onDone={() => {
            setQualityOpen(false)
            wo.refetch()
          }}
        />
      ) : null}
    </Screen>
  )
}

// ── Barcode scanner modal (reuses the Sayım camera pattern) ──────────────────
function ScanModal({ onClose, onScan }: { onClose: () => void; onScan: (row: ScanRow) => void }) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [flash, setFlash] = React.useState<{ ok: boolean; text: string; seq: number } | null>(null)
  const lastScanRef = React.useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const flashTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  const showFlash = React.useCallback((ok: boolean, text: string) => {
    setFlash({ ok, text, seq: Date.now() })
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 750)
  }, [])

  const onBarcodeScanned = React.useCallback(
    (result: BarcodeScanningResult) => {
      const code = (result?.data ?? '').trim()
      if (!code) return
      const last = lastScanRef.current
      const now = Date.now()
      if (code === last.code && now - last.at < SAME_CODE_MS) return
      lastScanRef.current = { code, at: now }

      void (async () => {
        let match: BarcodeMatchDto
        try {
          match = await api.inventory.products.byBarcode(code)
        } catch {
          Vibration.vibrate(120)
          showFlash(false, 'Barkod bulunamadı')
          onScan({ key: `${code}:${now}`, name: code, code, ok: false, at: now })
          return
        }
        Vibration.vibrate(35)
        showFlash(true, `✓ ${match.name}`)
        onScan({ key: `${match.productId}:${now}`, name: match.name, code: match.code || code, ok: true, at: now })
      })()
    },
    [onScan, showFlash],
  )

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing[2],
            paddingHorizontal: t.spacing[3],
            paddingVertical: t.spacing[2],
          }}
        >
          <Pressable onPress={onClose} hitSlop={8} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={26} color="#fff" />
          </Pressable>
          <Text variant="title" weight="bold" style={{ flex: 1, color: '#fff' }}>
            Barkod Doğrula
          </Text>
        </View>

        {!permission ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : !permission.granted ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.spacing[6], gap: t.spacing[4] }}>
            <Icon name="camera-off" size={44} color="rgba(255,255,255,0.7)" />
            <Text variant="title" weight="bold" style={{ textAlign: 'center', color: '#fff' }}>
              Kamera izni gerekli
            </Text>
            <Text variant="body" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
              Malzeme barkodunu doğrulamak için kamera erişimine izin verin.
            </Text>
            <Button title="Kamera izni ver" icon="camera" fullWidth onPress={() => void requestPermission()} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...SCAN_TYPES] }}
              onBarcodeScanned={onBarcodeScanned}
            />
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: '70%',
                  aspectRatio: 1.7,
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.9)',
                  borderRadius: t.radius.lg,
                }}
              />
              <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: t.spacing[3], fontWeight: '600' }}>
                Barkodu çerçeveye getir
              </Text>
            </View>
            {flash ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: flash.ok ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.30)',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingBottom: t.spacing[8],
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing[2],
                    paddingHorizontal: t.spacing[4],
                    paddingVertical: t.spacing[2.5],
                    borderRadius: t.radius.full,
                    backgroundColor: flash.ok ? '#16a34a' : '#dc2626',
                    maxWidth: '90%',
                  }}
                >
                  <Icon name={flash.ok ? 'check' : 'x'} size={18} color="#fff" />
                  <Text weight="semibold" numberOfLines={1} style={{ color: '#fff' }}>
                    {flash.text}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Modal>
  )
}

// ── Bitir (finish) sheet ─────────────────────────────────────────────────────
function FinishSheet({
  id,
  plannedQuantity,
  unit,
  submit,
  busy,
  onClose,
  onDone,
}: {
  id: string
  plannedQuantity: number
  unit: string
  submit: (fn: () => Promise<void>, opts?: { errorTitle?: string }) => Promise<void>
  busy: boolean
  onClose: () => void
  onDone: () => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [produced, setProduced] = React.useState(String(plannedQuantity))
  const [rejected, setRejected] = React.useState('0')

  const doFinish = () =>
    void submit(
      async () => {
        await api.production.workOrders.finish(id, {
          producedQuantity: Number(produced) || 0,
          rejectedQuantity: Number(rejected) || 0,
        })
        onDone()
      },
      { errorTitle: 'Bitirilemedi' },
    )

  return (
    <SheetShell title="İş Emrini Bitir" onClose={onClose} insetsBottom={insets.bottom}>
      <Text variant="caption" tone="muted">
        Gerçek süre iş merkezi saat ücretiyle çarpılıp operasyon maliyetine işlenir.
      </Text>
      <Input label={`Üretilen Miktar (${unit})`} keyboardType="numeric" value={produced} onChangeText={setProduced} />
      <Input label={`Reddedilen Miktar (${unit})`} keyboardType="numeric" value={rejected} onChangeText={setRejected} />
      <Button title="Bitir" icon="check" fullWidth loading={busy} onPress={doFinish} />
    </SheetShell>
  )
}

// ── Kalite Kaydet (record quality) sheet ─────────────────────────────────────
const RESULT_OPTIONS: SegmentOption<QualityCheckResult>[] = [
  { value: 'pass', label: 'Geçti' },
  { value: 'fail', label: 'Kaldı' },
]

function QualitySheet({
  manufacturingOrderId,
  workOrderId,
  plannedQuantity,
  submit,
  busy,
  onClose,
  onDone,
}: {
  manufacturingOrderId: string
  workOrderId: string
  plannedQuantity: number
  submit: (fn: () => Promise<void>, opts?: { errorTitle?: string }) => Promise<void>
  busy: boolean
  onClose: () => void
  onDone: () => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [result, setResult] = React.useState<QualityCheckResult>('pass')
  const [inspected, setInspected] = React.useState(String(plannedQuantity))
  const [passed, setPassed] = React.useState(String(plannedQuantity))
  const [rejected, setRejected] = React.useState('0')
  const [notes, setNotes] = React.useState('')

  const doRecord = () =>
    void submit(
      async () => {
        await api.production.qualityChecks.record({
          manufacturingOrderId,
          workOrderId,
          checkType: 'operation',
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

  return (
    <SheetShell title="Kalite Kaydet" onClose={onClose} insetsBottom={insets.bottom}>
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
      <Button title="Kaydet" icon="check" fullWidth loading={busy} onPress={doRecord} />
    </SheetShell>
  )
}

// ── Shared bottom-sheet shell ────────────────────────────────────────────────
function SheetShell({
  title,
  onClose,
  insetsBottom,
  children,
}: {
  title: string
  onClose: () => void
  insetsBottom: number
  children: React.ReactNode
}) {
  const t = useTheme()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: t.spacing[3] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.spacing[4], paddingVertical: t.spacing[3] }}>
            <Text variant="title" weight="bold" style={{ flex: 1 }}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={24} color={t.colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: insetsBottom + t.spacing[4], gap: t.spacing[4] }}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
