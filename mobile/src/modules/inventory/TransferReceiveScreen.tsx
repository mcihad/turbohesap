// ★ TransferReceiveScreen — the star of the Demirbaş & Zimmet feature: the
// "devralan" (receiver) side of the custody handshake. A live camera viewfinder
// (expo-camera CameraView, same pattern as the stocktake CountScanScreen) reads
// the QR shown by the giver; the scanned value IS the transfer token. We resolve
// it with assetTransfers.byToken → show a confirmation card (demirbaş + devreden
// kişi). "Devraldım" → accept({token}) (custody moves, vibration + success);
// "Reddet" → reject(id). Expired/invalid tokens show a friendly message and allow
// a re-scan. A manual token entry fallback covers cameras/QRs that won't scan.

import * as React from 'react'
import { ActivityIndicator, Pressable, TextInput, Vibration, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'

import {
  ASSET_TRANSFER_STATUS_LABELS,
  InventoryPermissions,
  toApiError,
  type AssetTransferDto,
} from '@turbohesap/shared'

import { Badge, Button, Icon, PermissionRequired, Text } from '../../components'
import { api } from '../../lib/api'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { transferStatusTone } from './asset-labels'

const SCAN_TYPES = ['qr', 'code128', 'ean13'] as const
const SAME_CODE_MS = 1500

type Phase =
  | { kind: 'scanning' }
  | { kind: 'resolving' }
  | { kind: 'review'; transfer: AssetTransferDto }
  | { kind: 'error'; message: string }
  | { kind: 'done'; transfer: AssetTransferDto }

export function TransferReceiveScreen() {
  const t = useTheme()
  const nav = useNav()
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()

  const [phase, setPhase] = React.useState<Phase>({ kind: 'scanning' })
  const [busy, setBusy] = React.useState(false)
  const [manual, setManual] = React.useState('')
  const lastScanRef = React.useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const phaseRef = React.useRef<Phase>(phase)
  phaseRef.current = phase

  // Resolve a scanned/typed token to its transfer.
  const resolveToken = React.useCallback((token: string) => {
    const value = token.trim()
    if (!value) return
    setPhase({ kind: 'resolving' })
    void (async () => {
      try {
        const transfer = await api.inventory.assetTransfers.byToken(value)
        if (transfer.status !== 'pending') {
          Vibration.vibrate(120)
          setPhase({
            kind: 'error',
            message: `Bu devir artık geçerli değil (${ASSET_TRANSFER_STATUS_LABELS[transfer.status]}).`,
          })
          return
        }
        Vibration.vibrate(35)
        setPhase({ kind: 'review', transfer })
      } catch (e) {
        Vibration.vibrate(120)
        setPhase({ kind: 'error', message: toApiError(e).message || 'Geçersiz ya da süresi dolmuş kod.' })
      }
    })()
  }, [])

  const onBarcodeScanned = React.useCallback(
    (result: BarcodeScanningResult) => {
      // Only scan in the scanning phase.
      if (phaseRef.current.kind !== 'scanning') return
      const code = (result?.data ?? '').trim()
      if (!code) return
      const last = lastScanRef.current
      const now = Date.now()
      if (code === last.code && now - last.at < SAME_CODE_MS) return
      lastScanRef.current = { code, at: now }
      resolveToken(code)
    },
    [resolveToken],
  )

  const accept = React.useCallback(
    (transfer: AssetTransferDto) => {
      setBusy(true)
      void (async () => {
        try {
          const result = await api.inventory.assetTransfers.accept({ token: transfer.token })
          Vibration.vibrate([0, 40, 60, 40])
          setPhase({ kind: 'done', transfer: result })
        } catch (e) {
          Vibration.vibrate(120)
          setPhase({ kind: 'error', message: toApiError(e).message || 'Devralma başarısız.' })
        } finally {
          setBusy(false)
        }
      })()
    },
    [],
  )

  const reject = React.useCallback(
    (transfer: AssetTransferDto) => {
      setBusy(true)
      void (async () => {
        try {
          await api.inventory.assetTransfers.reject(transfer.id)
        } catch {
          // even if it fails, return to scanning
        } finally {
          setBusy(false)
          setManual('')
          setPhase({ kind: 'scanning' })
        }
      })()
    },
    [],
  )

  const rescan = React.useCallback(() => {
    lastScanRef.current = { code: '', at: 0 }
    setManual('')
    setPhase({ kind: 'scanning' })
  }, [])

  // ── permission gates ──
  if (!permission) {
    return (
      <PermissionRequired permission={InventoryPermissions.assetsAssign} title="Zimmet Devral" onBack={nav.goBack}>
        <View style={{ flex: 1, backgroundColor: t.colors.background, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.primary} />
        </View>
      </PermissionRequired>
    )
  }

  if (!permission.granted) {
    return (
      <PermissionRequired permission={InventoryPermissions.assetsAssign} title="Zimmet Devral" onBack={nav.goBack}>
        <View style={{ flex: 1, backgroundColor: t.colors.background, alignItems: 'center', justifyContent: 'center', padding: t.spacing[6], gap: t.spacing[4] }}>
          <Icon name="camera-off" size={44} color={t.colors.mutedForeground} />
          <Text variant="title" weight="bold" style={{ textAlign: 'center' }}>
            Kamera izni gerekli
          </Text>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            QR kodu okutarak zimmet devralmak için kamera erişimine izin verin.
          </Text>
          <Button title="Kamera izni ver" icon="camera" fullWidth onPress={() => void requestPermission()} />
        </View>
      </PermissionRequired>
    )
  }

  const scanning = phase.kind === 'scanning'

  return (
    <PermissionRequired permission={InventoryPermissions.assetsAssign} title="Zimmet Devral" onBack={nav.goBack}>
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
        {/* Top bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing[2],
            paddingHorizontal: t.spacing[3],
            paddingVertical: t.spacing[2],
            backgroundColor: '#000',
          }}
        >
          <Pressable onPress={nav.goBack} hitSlop={8} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-left" size={26} color="#fff" />
          </Pressable>
          <Text variant="title" weight="bold" numberOfLines={1} style={{ flex: 1, color: '#fff' }}>
            Zimmet Devral
          </Text>
        </View>

        {/* Viewfinder */}
        <View style={{ height: '45%', backgroundColor: '#000', overflow: 'hidden' }}>
          {scanning ? (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...SCAN_TYPES] }}
              onBarcodeScanned={onBarcodeScanned}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {phase.kind === 'resolving' || busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Icon name="check-circle" size={44} color="rgba(255,255,255,0.5)" />
              )}
            </View>
          )}

          {/* Reticle */}
          {scanning ? (
            <View pointerEvents="none" style={{ ...absoluteFill, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: '62%',
                  aspectRatio: 1,
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.9)',
                  borderRadius: t.radius.lg,
                }}
              />
              <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: t.spacing[3], fontWeight: '600' }}>
                QR kodu çerçeveye getir
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bottom panel */}
        <View style={{ flex: 1, backgroundColor: t.colors.background, padding: t.spacing[4], gap: t.spacing[3] }}>
          {phase.kind === 'review' ? (
            <ReviewCard transfer={phase.transfer} busy={busy} onAccept={() => accept(phase.transfer)} onReject={() => reject(phase.transfer)} />
          ) : phase.kind === 'done' ? (
            <View style={{ alignItems: 'center', gap: t.spacing[4], paddingVertical: t.spacing[4] }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: t.radius.full,
                  backgroundColor: t.colors.success,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check" size={40} color={t.colors.successForeground} />
              </View>
              <Text variant="title" weight="bold" style={{ textAlign: 'center' }}>
                Devraldınız ✓
              </Text>
              <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
                {phase.transfer.asset?.name ?? 'Demirbaş'} artık sizin zimmetinizde.
              </Text>
              <View style={{ flexDirection: 'row', gap: t.spacing[2], alignSelf: 'stretch' }}>
                <View style={{ flex: 1 }}>
                  <Button title="Yeni okut" variant="outline" icon="maximize" fullWidth onPress={rescan} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Bitti" icon="check" fullWidth onPress={nav.goBack} />
                </View>
              </View>
            </View>
          ) : phase.kind === 'error' ? (
            <View style={{ alignItems: 'center', gap: t.spacing[3], paddingVertical: t.spacing[2] }}>
              <Icon name="alert-triangle" size={36} color={t.colors.destructive} />
              <Text variant="body" weight="semibold" tone="destructive" style={{ textAlign: 'center' }}>
                {phase.message}
              </Text>
              <Button title="Tekrar okut" icon="maximize" fullWidth onPress={rescan} />
            </View>
          ) : (
            // scanning / resolving → manual fallback
            <>
              <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                Kod okunmuyorsa kodu elle girin
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing[2],
                    height: 48,
                    paddingHorizontal: t.spacing[3.5],
                    borderRadius: t.radius.md,
                    borderWidth: 1,
                    borderColor: t.colors.inputBorder,
                    backgroundColor: t.colors.card,
                  }}
                >
                  <Icon name="hash" size={18} color={t.colors.mutedForeground} />
                  <TextInput
                    value={manual}
                    onChangeText={setManual}
                    placeholder="Devir kodu / token"
                    placeholderTextColor={t.colors.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={() => resolveToken(manual)}
                    style={{ flex: 1, color: t.colors.foreground, fontSize: t.type.size.base, paddingVertical: 0 }}
                  />
                </View>
                <Button title="Bul" icon="search" disabled={!manual.trim()} onPress={() => resolveToken(manual)} />
              </View>
            </>
          )}
        </View>
      </View>
    </PermissionRequired>
  )
}

function ReviewCard({
  transfer,
  busy,
  onAccept,
  onReject,
}: {
  transfer: AssetTransferDto
  busy: boolean
  onAccept: () => void
  onReject: () => void
}) {
  const t = useTheme()
  const asset = transfer.asset
  return (
    <View style={{ gap: t.spacing[4] }}>
      <View
        style={{
          gap: t.spacing[3],
          padding: t.spacing[4],
          borderRadius: t.radius.xl,
          borderWidth: 1,
          borderColor: t.colors.primary,
          backgroundColor: t.colors.card,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: t.radius.md,
              backgroundColor: t.colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={asset?.isVehicle ? 'truck' : 'box'} size={24} color={t.colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body" weight="bold" numberOfLines={1}>
              {asset?.name ?? 'Demirbaş'}
            </Text>
            <Text variant="caption" tone="muted">
              {asset?.code ?? ''}
              {asset?.plate ? ` · ${asset.plate}` : ''}
            </Text>
          </View>
          <Badge label={ASSET_TRANSFER_STATUS_LABELS[transfer.status]} tone={transferStatusTone(transfer.status)} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
          <Icon name="user" size={16} color={t.colors.mutedForeground} />
          <Text variant="caption" tone="muted">
            Devreden: {transfer.fromEmployeeName ?? transfer.initiatedByName ?? 'Bilinmiyor'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
        <View style={{ flex: 1 }}>
          <Button title="Reddet" variant="outline" icon="x" fullWidth loading={busy} onPress={onReject} />
        </View>
        <View style={{ flex: 2 }}>
          <Button title="Devraldım" icon="check" fullWidth loading={busy} onPress={onAccept} />
        </View>
      </View>
    </View>
  )
}

const absoluteFill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 }
