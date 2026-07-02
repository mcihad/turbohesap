// Parti/Seri (lot/serial) listesi — arama + kamera ile parti bulma (barkod/etiket
// = lotNo) ve bir "+" ile Üretim Emrine tüketilen/üretilen parti bağlama
// (registerConsumption / registerOutput, yeni partiyi otomatik oluşturur). Bir
// partiye dokununca izlenebilirlik (şecere) ekranı açılır. Listeyi görmek read,
// parti bağlamak production.quality.manage ister.

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
  type LotDto,
  type LotKind,
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
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const SCAN_TYPES = ['ean13', 'ean8', 'code128', 'qr', 'upc_a', 'code39'] as const

export function LotsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canManage = hasPermission(ProductionPermissions.qualityManage)
  const [query, setQuery] = React.useState('')
  const [scanOpen, setScanOpen] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const lots = useAsync(() => api.production.lots.list(), [], { enabled: canRead })
  const list = lots.data ?? []

  const q = query.trim().toLocaleLowerCase('tr')
  const filtered = React.useMemo(
    () =>
      !q ? list : list.filter((l) => `${l.lotNo} ${l.productName}`.toLocaleLowerCase('tr').includes(q)),
    [list, q],
  )

  const openTrace = (lot: LotDto) => nav.navigate('production.lot.trace', { lotId: lot.id, lotNo: lot.lotNo }, lot.lotNo)

  // Barcode scan → match a lot by its lotNo (the label carries the lot number).
  const onScanned = (code: string) => {
    const norm = code.trim().toLocaleLowerCase('tr')
    const hit = list.find((l) => l.lotNo.toLocaleLowerCase('tr') === norm)
    if (hit) {
      setScanOpen(false)
      openTrace(hit)
      return true
    }
    return false
  }

  return (
    <PermissionRequired
      permission={ProductionPermissions.read}
      title="Parti/Seri"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Parti/Seri',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: (
            <>
              <HeaderAction icon="camera" onPress={() => setScanOpen(true)} />
              {canManage ? <HeaderAction icon="plus" onPress={() => setSheetOpen(true)} /> : null}
            </>
          ),
        }}
        onRefresh={lots.refetch}
        refreshing={lots.refreshing}
      >
        {list.length > 0 ? (
          <Input icon="search" placeholder="Parti no / ürün ara" value={query} onChangeText={setQuery} />
        ) : null}

        {lots.loading ? (
          <SkeletonRows count={6} />
        ) : lots.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={lots.error}
            actionLabel="Tekrar dene"
            onAction={lots.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="hash"
            title="Parti bulunamadı"
            description={q ? 'Bu arama için parti yok.' : 'Henüz parti/seri kaydı yok.'}
            actionLabel={canManage && !q ? 'Parti Bağla' : undefined}
            onAction={canManage && !q ? () => setSheetOpen(true) : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Parti
            </Text>
            <ListCard>
              {filtered.map((l) => (
                <ListRow
                  key={l.id}
                  icon="hash"
                  title={l.lotNo}
                  subtitle={l.productName}
                  trailing={<Badge label={l.kind === 'serial' ? 'Seri' : 'Parti'} tone={l.kind === 'serial' ? 'info' : 'muted'} />}
                  onPress={() => openTrace(l)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>

      {scanOpen ? <FindLotScanner onClose={() => setScanOpen(false)} onScanned={onScanned} /> : null}

      {sheetOpen ? (
        <RegisterLotSheet
          onClose={() => setSheetOpen(false)}
          onDone={() => {
            setSheetOpen(false)
            lots.refetch()
          }}
        />
      ) : null}
    </PermissionRequired>
  )
}

// ── Register consume/produce sheet ───────────────────────────────────────────
type RegisterMode = 'consume' | 'produce'
const MODE_OPTIONS: SegmentOption<RegisterMode>[] = [
  { value: 'consume', label: 'Tüketilen' },
  { value: 'produce', label: 'Üretilen' },
]
const KIND_OPTIONS: SegmentOption<LotKind>[] = [
  { value: 'lot', label: 'Parti' },
  { value: 'serial', label: 'Seri' },
]

function RegisterLotSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { submit, busy } = useSubmit()

  const orders = useAsync(() => api.production.orders.list(), [])
  const products = useAsync(() => api.inventory.products.list(), [])

  const [mode, setMode] = React.useState<RegisterMode>('produce')
  const [manufacturingOrderId, setManufacturingOrderId] = React.useState('')
  const [productId, setProductId] = React.useState('')
  const [lotNo, setLotNo] = React.useState('')
  const [quantity, setQuantity] = React.useState('0')
  const [kind, setKind] = React.useState<LotKind>('lot')

  const orderOptions = React.useMemo<SelectOption<string>[]>(
    () => [
      { value: '', label: 'Üretim emri seçin' },
      ...(orders.data ?? []).map((o) => ({ value: o.id, label: `${o.orderNo} · ${o.productName}` })),
    ],
    [orders.data],
  )
  const productOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'Ürün seçin' }, ...(products.data ?? []).map((p) => ({ value: p.id, label: p.name }))],
    [products.data],
  )

  const register = () => {
    if (!manufacturingOrderId) {
      alert('Üretim emri seçilmelidir')
      return
    }
    if (!productId) {
      alert('Ürün seçilmelidir')
      return
    }
    if (!lotNo.trim()) {
      alert('Parti/seri no girilmelidir')
      return
    }
    void submit(
      async () => {
        const body = {
          manufacturingOrderId,
          productId,
          lotNo: lotNo.trim(),
          quantity: Number(quantity) || 0,
          kind,
        }
        if (mode === 'consume') await api.production.lots.registerConsumption(body)
        else await api.production.lots.registerOutput(body)
        onDone()
      },
      { errorTitle: 'Parti bağlanamadı' },
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
              Parti Bağla
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={24} color={t.colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: insets.bottom + t.spacing[4], gap: t.spacing[4] }}>
            <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
            <FormSelect label="Üretim Emri" value={manufacturingOrderId} options={orderOptions} onChange={setManufacturingOrderId} />
            <FormSelect label="Ürün" value={productId} options={productOptions} onChange={setProductId} />
            <Input label="Parti / Seri No" value={lotNo} onChangeText={setLotNo} placeholder="örn. LOT-2026-001" />
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Input label="Miktar" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
              </View>
            </View>
            <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={setKind} />
            <Button title="Bağla" icon="check" fullWidth loading={busy} onPress={register} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Find-lot barcode scanner (reuses the Sayım camera pattern) ───────────────
function FindLotScanner({
  onClose,
  onScanned,
}: {
  onClose: () => void
  onScanned: (code: string) => boolean
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [flash, setFlash] = React.useState<{ ok: boolean; text: string } | null>(null)
  const lastScanRef = React.useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const flashTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current) }, [])

  const showFlash = (ok: boolean, text: string) => {
    setFlash({ ok, text })
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 900)
  }

  const handle = (result: BarcodeScanningResult) => {
    const code = (result?.data ?? '').trim()
    if (!code) return
    const now = Date.now()
    if (code === lastScanRef.current.code && now - lastScanRef.current.at < 1200) return
    lastScanRef.current = { code, at: now }
    const found = onScanned(code)
    if (found) {
      Vibration.vibrate(35)
    } else {
      Vibration.vibrate(120)
      showFlash(false, `Parti bulunamadı: ${code}`)
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2], paddingHorizontal: t.spacing[3], paddingVertical: t.spacing[2] }}>
          <Pressable onPress={onClose} hitSlop={8} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={26} color="#fff" />
          </Pressable>
          <Text variant="title" weight="bold" style={{ flex: 1, color: '#fff' }}>
            Parti Bul (Tara)
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
              Parti etiketini tarayarak izlenebilirlik kaydına ulaşmak için kameraya izin verin.
            </Text>
            <Button title="Kamera izni ver" icon="camera" fullWidth onPress={() => void requestPermission()} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...SCAN_TYPES] }}
              onBarcodeScanned={handle}
            />
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: '70%', aspectRatio: 1.7, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', borderRadius: t.radius.lg }} />
              <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: t.spacing[3], fontWeight: '600' }}>
                Parti etiketini çerçeveye getir
              </Text>
            </View>
            {flash ? (
              <View
                pointerEvents="none"
                style={{ position: 'absolute', left: 0, right: 0, bottom: t.spacing[8], alignItems: 'center' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2], paddingHorizontal: t.spacing[4], paddingVertical: t.spacing[2.5], borderRadius: t.radius.full, backgroundColor: '#dc2626', maxWidth: '90%' }}>
                  <Icon name="x" size={18} color="#fff" />
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
