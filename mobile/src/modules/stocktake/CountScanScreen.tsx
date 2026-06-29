// ★ CountScanScreen — the star of the Sayım module: a fast, one-handed barcode
// counting surface. The top ~45% is a live camera viewfinder with a scan reticle;
// each recognised barcode is resolved instantly (api.inventory.products.byBarcode),
// the matching count line's quantity is bumped by the pack size, and the user gets
// immediate feedback (vibration + a colour flash + a toast). The bottom half is a
// running, most-recent-first counted list with big ± steppers, manual qty entry,
// "undo last", and a search box to count items that have no scannable barcode.
//
// Resilience: counts are applied OPTIMISTICALLY to local state and the unsynced
// deltas are flushed to api.stocktake.submitEntries in batches (a timer, after
// enough scans, and on leaving the screen). A failed batch keeps the deltas local
// and retries, so a brief disconnect never loses work. Blind counts never reveal
// expectedQty/difference here.
//
// NOTE: expo-haptics is not installed in this app, so tactile feedback uses RN's
// Vibration API.

import * as React from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  Vibration,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'

import { toApiError, type BarcodeMatchDto, type StockCountLineDto } from '@turbohesap/shared'

import { Badge, Button, EmptyState, Icon, Text } from '../../components'
import { api } from '../../lib/api'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatQty } from './format'

// Local per-line counting state. `baseQty` is the server's countedQty at load;
// `localQty` is everything added this session (optimistic); `syncedQty` is how
// much of `localQty` the server has acknowledged. Unsynced delta = localQty −
// syncedQty. Displayed total = baseQty + localQty.
interface CountRow {
  key: string
  lineId: string | null
  productId: string
  variantId: string | null
  name: string
  unit: string
  code: string
  baseQty: number
  expectedQty: number
  localQty: number
  syncedQty: number
  /** Date.now() of the last change — drives the most-recent-first ordering. */
  lastTouched: number
}

interface Flash {
  type: 'ok' | 'err'
  text: string
  /** Bumped on every scan so the same code re-triggers the flash animation. */
  seq: number
}

const SCAN_TYPES = ['ean13', 'ean8', 'code128', 'qr', 'upc_a', 'code39'] as const
const SAME_CODE_MS = 1200 // ignore a re-read of the same code within this window
const FLUSH_INTERVAL_MS = 3500
const FLUSH_AT_UNITS = 10 // flush once this many unsynced units accumulate

function rowKey(productId: string, variantId: string | null): string {
  return `p:${productId}:${variantId ?? ''}`
}

function rowFromLine(l: StockCountLineDto): CountRow {
  return {
    key: l.id,
    lineId: l.id,
    productId: l.productId,
    variantId: l.variantId,
    name: l.name,
    unit: l.unit,
    code: l.code,
    baseQty: l.countedQty,
    expectedQty: l.expectedQty,
    localQty: 0,
    syncedQty: 0,
    lastTouched: 0,
  }
}

export function CountScanScreen() {
  const t = useTheme()
  const nav = useNav()
  const insets = useSafeAreaInsets()

  const id = String(nav.current.params?.id ?? '')
  const blind = nav.current.params?.blind === true

  const [permission, requestPermission] = useCameraPermissions()

  const [rows, setRows] = React.useState<CountRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [flash, setFlash] = React.useState<Flash | null>(null)
  const [query, setQuery] = React.useState('')
  const [syncing, setSyncing] = React.useState(false)
  const [syncError, setSyncError] = React.useState(false)
  const [lastSyncAt, setLastSyncAt] = React.useState<number | null>(null)
  const [scannerOn, setScannerOn] = React.useState(true)

  // Refs mirror state so the flush timer / unmount handler read the latest values
  // without re-subscribing.
  const rowsRef = React.useRef<CountRow[]>(rows)
  rowsRef.current = rows
  const syncingRef = React.useRef(false)
  const lastScanRef = React.useRef<{ code: string; at: number }>({ code: '', at: 0 })
  // Undo stack of applied bumps (most recent last).
  const historyRef = React.useRef<{ key: string; delta: number }[]>([])
  const flashTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── load lines ──
  const loadLines = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const lines = await api.stocktake.lines(id)
      setRows(lines.map(rowFromLine))
    } catch (e) {
      setLoadError(toApiError(e).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  React.useEffect(() => {
    void loadLines()
  }, [loadLines])

  // ── batch sync ──
  const flush = React.useCallback(async () => {
    if (syncingRef.current) return
    const dirty = rowsRef.current.filter((r) => r.localQty !== r.syncedQty)
    if (dirty.length === 0) return
    syncingRef.current = true
    setSyncing(true)
    // Snapshot the localQty we're about to confirm, so concurrent bumps aren't lost.
    const snapshot = dirty.map((r) => ({ key: r.key, localQty: r.localQty }))
    try {
      const entries = dirty.map((r) =>
        r.lineId
          ? { lineId: r.lineId, qty: r.localQty - r.syncedQty }
          : { productId: r.productId, variantId: r.variantId, qty: r.localQty - r.syncedQty },
      )
      await api.stocktake.submitEntries(id, { entries })
      setSyncError(false)
      setLastSyncAt(Date.now())
      setRows((cur) =>
        cur.map((r) => {
          const s = snapshot.find((x) => x.key === r.key)
          return s ? { ...r, syncedQty: s.localQty } : r
        }),
      )
    } catch {
      // Keep the deltas local; the timer will retry on the next tick.
      setSyncError(true)
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [id])

  // Periodic flush.
  React.useEffect(() => {
    const handle = setInterval(() => void flush(), FLUSH_INTERVAL_MS)
    return () => clearInterval(handle)
  }, [flush])

  // Flush a final batch when the screen unmounts (back / tab switch).
  React.useEffect(() => {
    return () => {
      void flush()
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [flush])

  const unsyncedUnits = React.useMemo(
    () => rows.reduce((s, r) => s + Math.abs(r.localQty - r.syncedQty), 0),
    [rows],
  )
  // Eager flush once enough has accumulated (don't wait for the timer).
  React.useEffect(() => {
    if (unsyncedUnits >= FLUSH_AT_UNITS) void flush()
  }, [unsyncedUnits, flush])

  const totalOf = (r: CountRow) => r.baseQty + r.localQty

  const showFlash = React.useCallback((next: Flash) => {
    setFlash(next)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 750)
  }, [])

  // Apply a quantity delta to a row (by key), recording it for undo unless this
  // IS an undo. Creates the row if missing (unlisted scan).
  const bump = React.useCallback(
    (key: string, delta: number, opts?: { record?: boolean; seed?: Omit<CountRow, 'localQty' | 'syncedQty' | 'lastTouched'> }) => {
      if (delta === 0) return
      const now = Date.now()
      setRows((cur) => {
        const idx = cur.findIndex((r) => r.key === key)
        if (idx >= 0) {
          const next = [...cur]
          const r = next[idx]
          const nextLocal = Math.max(-r.baseQty, r.localQty + delta) // never drive total below 0
          next[idx] = { ...r, localQty: nextLocal, lastTouched: now }
          return next
        }
        if (opts?.seed) {
          return [...cur, { ...opts.seed, localQty: Math.max(0, delta), syncedQty: 0, lastTouched: now }]
        }
        return cur
      })
      if (opts?.record !== false) historyRef.current.push({ key, delta })
    },
    [],
  )

  // Set a row's TOTAL to an absolute value (manual entry) via the equivalent delta.
  const setTotal = React.useCallback(
    (row: CountRow, total: number) => {
      const target = Math.max(0, total)
      bump(row.key, target - totalOf(row))
    },
    [bump],
  )

  const undoLast = React.useCallback(() => {
    const last = historyRef.current.pop()
    if (!last) return
    bump(last.key, -last.delta, { record: false })
    Vibration.vibrate(20)
  }, [bump])

  // ── barcode handler ──
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
          showFlash({ type: 'err', text: 'Barkod bulunamadı', seq: now })
          return
        }
        const step = match.packQty > 0 ? match.packQty : 1
        const key = rowKey(match.productId, match.variantId)
        // Find an existing row by product+variant (loaded lines are keyed by lineId,
        // so match on the product identity, not the key).
        const existing = rowsRef.current.find(
          (r) => r.productId === match.productId && (r.variantId ?? '') === (match.variantId ?? ''),
        )
        const targetKey = existing?.key ?? key
        bump(targetKey, step, {
          seed: {
            key,
            lineId: null,
            productId: match.productId,
            variantId: match.variantId,
            name: match.name,
            unit: match.unit,
            code: match.code,
            baseQty: 0,
            expectedQty: 0,
          },
        })
        const newTotal = (existing ? totalOf(existing) : 0) + step
        Vibration.vibrate(35)
        showFlash({ type: 'ok', text: `✓ ${match.name} (toplam ${formatQty(newTotal)})`, seq: now })
      })()
    },
    [bump, showFlash],
  )

  // ── derived lists ──
  const q = query.trim().toLocaleLowerCase('tr')
  const searchResults = React.useMemo(() => {
    if (!q) return []
    return rows
      .filter((r) => `${r.name} ${r.code}`.toLocaleLowerCase('tr').includes(q))
      .slice(0, 40)
  }, [rows, q])

  // Counted list = rows touched this session, most-recent first.
  const counted = React.useMemo(
    () => rows.filter((r) => r.localQty !== 0).sort((a, b) => b.lastTouched - a.lastTouched),
    [rows],
  )

  // ── permission gate ──
  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: insets.top }}>
        <TopBar title="Say (Tara)" onBack={nav.goBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.primary} />
        </View>
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: insets.top }}>
        <TopBar title="Say (Tara)" onBack={nav.goBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.spacing[6], gap: t.spacing[4] }}>
          <Icon name="camera-off" size={44} color={t.colors.mutedForeground} />
          <Text variant="title" weight="bold" style={{ textAlign: 'center' }}>
            Kamera izni gerekli
          </Text>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            Barkod tarayarak hızlı sayım yapmak için kamera erişimine izin verin.
          </Text>
          <Button title="Kamera izni ver" icon="camera" fullWidth onPress={() => void requestPermission()} />
        </View>
      </View>
    )
  }

  const cameraHeight = '45%' as const

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
      <TopBar
        title="Say (Tara)"
        onBack={nav.goBack}
        right={
          <Pressable onPress={() => setScannerOn((v) => !v)} hitSlop={8}>
            <Icon name={scannerOn ? 'pause' : 'play'} size={22} color="#fff" />
          </Pressable>
        }
        dark
      />

      {/* ── Viewfinder ── */}
      <View style={{ height: cameraHeight, backgroundColor: '#000', overflow: 'hidden' }}>
        {scannerOn ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...SCAN_TYPES] }}
            onBarcodeScanned={onBarcodeScanned}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="pause-circle" size={40} color="rgba(255,255,255,0.5)" />
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
              Tarayıcı duraklatıldı
            </Text>
          </View>
        )}

        {/* Reticle */}
        <View pointerEvents="none" style={{ ...absoluteFill, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: '70%',
              aspectRatio: 1.7,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.9)',
              borderRadius: t.radius.lg,
              backgroundColor: 'transparent',
            }}
          />
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: t.spacing[3], fontWeight: '600' }}>
            Barkodu çerçeveye getir
          </Text>
        </View>

        {/* Colour flash + toast */}
        {flash ? (
          <View
            pointerEvents="none"
            style={{
              ...absoluteFill,
              backgroundColor: flash.type === 'ok' ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.30)',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingBottom: t.spacing[5],
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
                backgroundColor: flash.type === 'ok' ? '#16a34a' : '#dc2626',
                maxWidth: '90%',
              }}
            >
              <Icon name={flash.type === 'ok' ? 'check' : 'x'} size={18} color="#fff" />
              <Text weight="semibold" numberOfLines={1} style={{ color: '#fff' }}>
                {flash.text}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Sync status bar ── */}
      <SyncBar
        syncing={syncing}
        pending={unsyncedUnits}
        error={syncError}
        lastSyncAt={lastSyncAt}
        onRetry={() => void flush()}
      />

      {/* ── Bottom counting panel ── */}
      <View style={{ flex: 1, backgroundColor: t.colors.background }}>
        <View style={{ paddingHorizontal: t.spacing[4], paddingTop: t.spacing[3], gap: t.spacing[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing[2],
                height: 46,
                paddingHorizontal: t.spacing[3.5],
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.inputBorder,
                backgroundColor: t.colors.card,
              }}
            >
              <Icon name="search" size={18} color={t.colors.mutedForeground} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Barkodsuz say — ürün ara (ad / kod)…"
                placeholderTextColor={t.colors.mutedForeground}
                style={{ flex: 1, color: t.colors.foreground, fontSize: t.type.size.base, paddingVertical: 0 }}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Icon name="x" size={18} color={t.colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              onPress={undoLast}
              hitSlop={6}
              style={{
                width: 46,
                height: 46,
                borderRadius: t.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: t.colors.inputBorder,
                backgroundColor: t.colors.card,
              }}
            >
              <Icon name="rotate-ccw" size={20} color={t.colors.foreground} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: t.spacing[4],
            paddingBottom: insets.bottom + t.spacing[6],
            gap: t.spacing[2.5],
          }}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: t.spacing[8] }}>
              <ActivityIndicator color={t.colors.primary} />
            </View>
          ) : loadError ? (
            <EmptyState
              icon="alert-triangle"
              tone="destructive"
              title="Kalemler yüklenemedi"
              description={loadError}
              actionLabel="Tekrar dene"
              onAction={() => void loadLines()}
            />
          ) : q ? (
            // Search mode → all matching lines with steppers.
            searchResults.length === 0 ? (
              <EmptyState icon="search" title="Eşleşme yok" description="Bu arama için kalem bulunamadı." />
            ) : (
              <>
                <Text variant="overline" tone="muted">
                  {searchResults.length} sonuç
                </Text>
                {searchResults.map((r) => (
                  <CountRowCard
                    key={r.key}
                    row={r}
                    total={totalOf(r)}
                    blind={blind}
                    onInc={() => bump(r.key, 1)}
                    onDec={() => bump(r.key, -1)}
                    onSet={(v) => setTotal(r, v)}
                  />
                ))}
              </>
            )
          ) : counted.length === 0 ? (
            <EmptyState
              icon="maximize"
              title="Henüz sayım yok"
              description="Barkod tarayın ya da yukarıdan ürün arayıp sayın."
            />
          ) : (
            <>
              <Text variant="overline" tone="muted">
                Sayılanlar ({counted.length})
              </Text>
              {counted.map((r) => (
                <CountRowCard
                  key={r.key}
                  row={r}
                  total={totalOf(r)}
                  blind={blind}
                  highlight
                  onInc={() => bump(r.key, 1)}
                  onDec={() => bump(r.key, -1)}
                  onSet={(v) => setTotal(r, v)}
                />
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  )
}

// ── A counted line card: name + unit, optional expected (non-blind), and a big
// ± stepper with tap-to-edit qty. ──────────────────────────────────────────
function CountRowCard({
  row,
  total,
  blind,
  highlight,
  onInc,
  onDec,
  onSet,
}: {
  row: CountRow
  total: number
  blind: boolean
  highlight?: boolean
  onInc: () => void
  onDec: () => void
  onSet: (value: number) => void
}) {
  const t = useTheme()
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState('')

  const diff = total - row.expectedQty
  const commit = () => {
    const v = Number(draft.replace(',', '.'))
    if (Number.isFinite(v)) onSet(v)
    setEditing(false)
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[3],
        padding: t.spacing[3],
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: highlight ? t.colors.primary : t.colors.border,
        backgroundColor: t.colors.card,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {row.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
          <Text variant="caption" tone="muted">
            {row.code || row.unit}
          </Text>
          {!blind ? (
            <Text variant="caption" tone="muted">
              · Beklenen {formatQty(row.expectedQty)}
            </Text>
          ) : null}
          {!blind && total !== row.expectedQty ? (
            <Badge label={diff > 0 ? `+${formatQty(diff)}` : formatQty(diff)} tone={diff > 0 ? 'info' : 'destructive'} />
          ) : null}
        </View>
      </View>

      <Pressable onPress={onDec} hitSlop={8}>
        <Icon name="minus-circle" size={34} color={t.colors.mutedForeground} />
      </Pressable>

      {editing ? (
        <TextInput
          autoFocus
          value={draft}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="numeric"
          style={{
            minWidth: 52,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: '700',
            color: t.colors.foreground,
            borderBottomWidth: 1,
            borderBottomColor: t.colors.primary,
            paddingVertical: 0,
          }}
        />
      ) : (
        <Pressable
          onPress={() => {
            setDraft(formatQty(total))
            setEditing(true)
          }}
          hitSlop={8}
          style={{ minWidth: 52, alignItems: 'center' }}
        >
          <Text variant="h2" weight="bold">
            {formatQty(total)}
          </Text>
        </Pressable>
      )}

      <Pressable onPress={onInc} hitSlop={8}>
        <Icon name="plus-circle" size={34} color={t.colors.primary} />
      </Pressable>
    </View>
  )
}

// ── Sync indicator strip ────────────────────────────────────────────────────
function SyncBar({
  syncing,
  pending,
  error,
  lastSyncAt,
  onRetry,
}: {
  syncing: boolean
  pending: number
  error: boolean
  lastSyncAt: number | null
  onRetry: () => void
}) {
  const t = useTheme()
  const synced = pending === 0 && !error
  const bg = error ? t.colors.destructive : synced ? t.colors.success : t.colors.warning
  const label = syncing
    ? 'Senkronize ediliyor…'
    : error
      ? 'Bağlantı yok — tekrar denenecek'
      : pending > 0
        ? `${pending} kayıt bekliyor`
        : lastSyncAt
          ? 'Senkronize ✓'
          : 'Hazır'

  return (
    <Pressable
      onPress={error || pending > 0 ? onRetry : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[2],
        paddingHorizontal: t.spacing[4],
        paddingVertical: t.spacing[1.5],
        backgroundColor: t.colors.card,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
      }}
    >
      {syncing ? (
        <ActivityIndicator size="small" color={bg} />
      ) : (
        <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: bg }} />
      )}
      <Text variant="caption" weight="medium" style={{ flex: 1, color: t.colors.mutedForeground }}>
        {label}
      </Text>
      {(error || pending > 0) && !syncing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1] }}>
          <Icon name="refresh-cw" size={13} color={t.colors.mutedForeground} />
          <Text variant="caption" tone="muted">
            Senkronize et
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}

// ── Minimal top bar (camera screen has its own dark chrome) ─────────────────
function TopBar({
  title,
  onBack,
  right,
  dark,
}: {
  title: string
  onBack: () => void
  right?: React.ReactNode
  dark?: boolean
}) {
  const t = useTheme()
  const fg = dark ? '#fff' : t.colors.foreground
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[2],
        paddingHorizontal: t.spacing[3],
        paddingVertical: t.spacing[2],
        backgroundColor: dark ? '#000' : t.colors.background,
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={8}
        style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={26} color={fg} />
      </Pressable>
      <Text variant="title" weight="bold" numberOfLines={1} style={{ flex: 1, color: fg }}>
        {title}
      </Text>
      {right}
    </View>
  )
}

const absoluteFill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 }
