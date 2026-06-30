// TransferInitiateScreen — the "devreden" (giver) side of the zimmet devir
// handshake. For a chosen asset, the holder optionally restricts who may accept
// (employee picker) and the token lifetime, then taps "Devri Başlat" →
// assetTransfers.initiate. The returned `token` is rendered as a large QR code
// (react-native-qrcode-svg); the receiver scans it from the "Zimmet Devral"
// screen. We poll the transfer every few seconds and flip to a success state when
// it is accepted. "İptal" cancels a still-pending transfer.

import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import {
  InventoryPermissions,
  type AssetTransferDto,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormSelect,
  Icon,
  PermissionRequired,
  Screen,
  Text,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const EXPIRY_OPTIONS: SelectOption<string>[] = [
  { value: '15', label: '15 dakika' },
  { value: '30', label: '30 dakika' },
  { value: '60', label: '1 saat' },
  { value: '180', label: '3 saat' },
  { value: '1440', label: '1 gün' },
]

export function TransferInitiateScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canAssign = hasPermission(InventoryPermissions.assetsAssign)

  const assetId = String(nav.current.params?.assetId ?? '')
  const assetName = String(nav.current.params?.assetName ?? 'Demirbaş')

  const [toEmployeeId, setToEmployeeId] = React.useState<string>('')
  const [expiry, setExpiry] = React.useState<string>('60')
  const [transfer, setTransfer] = React.useState<AssetTransferDto | null>(null)
  const { submit, busy } = useSubmit()

  // Employee picker options (optional target). Best-effort — needs hr read on the
  // server; an empty list simply means "anyone may accept".
  const employees = useAsync(() => api.hr.employees.list(), [], { enabled: canAssign })
  const employeeOptions = React.useMemo<SelectOption<string>[]>(
    () => [
      { value: '', label: 'Herkes (kısıtlama yok)' },
      ...(employees.data ?? []).map((e) => ({ value: e.id, label: e.fullName })),
    ],
    [employees.data],
  )

  const accepted = transfer?.status === 'accepted'

  // Poll the pending transfer until a terminal state.
  React.useEffect(() => {
    if (!transfer || transfer.status !== 'pending') return
    const id = transfer.id
    const handle = setInterval(() => {
      void (async () => {
        try {
          const fresh = await api.inventory.assetTransfers.get(id)
          setTransfer(fresh)
        } catch {
          // transient — keep polling
        }
      })()
    }, 3000)
    return () => clearInterval(handle)
  }, [transfer])

  const start = () =>
    submit(
      async () => {
        const created = await api.inventory.assetTransfers.initiate({
          assetId,
          toEmployeeId: toEmployeeId || null,
          expiresInMinutes: Number(expiry),
        })
        setTransfer(created)
      },
      { errorTitle: 'Devir başlatılamadı' },
    )

  const cancel = () => {
    if (!transfer) return
    void submit(
      async () => {
        await api.inventory.assetTransfers.cancel(transfer.id)
      },
      { errorTitle: 'İptal edilemedi', onSuccess: nav.goBack },
    )
  }

  return (
    <PermissionRequired permission={InventoryPermissions.assetsAssign} title="Zimmet devret" onBack={nav.goBack}>
      <Screen header={{ title: 'Zimmet devret', subtitle: assetName, onBack: nav.goBack }}>
        {!assetId ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Demirbaş bulunamadı" description="Geçersiz devir isteği." />
        ) : accepted ? (
          // ── Success ──
          <Card style={{ alignItems: 'center', gap: t.spacing[4], paddingVertical: t.spacing[6] }}>
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
              Devredildi ✓
            </Text>
            <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
              {assetName} artık {transfer?.acceptedByEmployeeName ?? 'karşı tarafın'} zimmetinde.
            </Text>
            <Button title="Tamam" icon="check" fullWidth onPress={nav.goBack} />
          </Card>
        ) : transfer ? (
          // ── Pending: show the QR ──
          <>
            <Card style={{ alignItems: 'center', gap: t.spacing[4], paddingVertical: t.spacing[5] }}>
              <Badge label="Devralınması bekleniyor" tone="warning" />
              <Text variant="title" weight="bold" style={{ textAlign: 'center' }}>
                {assetName}
              </Text>
              <View
                style={{
                  padding: t.spacing[4],
                  backgroundColor: '#FFFFFF',
                  borderRadius: t.radius.xl,
                }}
              >
                <QRCode value={transfer.token} size={240} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                <ActivityIndicator size="small" color={t.colors.primary} />
                <Text variant="caption" tone="muted">
                  Karşı taraf bekleniyor…
                </Text>
              </View>
              <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
                Karşı taraf "Zimmet Devral" ekranından bu kodu okutsun.
              </Text>
              {transfer.toEmployeeName ? (
                <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                  Hedef personel: {transfer.toEmployeeName}
                </Text>
              ) : null}
            </Card>

            <Button title="İptal et" variant="outline" icon="x" fullWidth loading={busy} onPress={cancel} />
          </>
        ) : (
          // ── Setup ──
          <>
            <Card style={{ gap: t.spacing[2], marginBottom: t.spacing[3] }}>
              <Text variant="body" weight="semibold">
                {assetName}
              </Text>
              <Text variant="caption" tone="muted">
                Devri başlatınca bir QR kod oluşturulur; karşı taraf bunu "Zimmet Devral" ekranından okutarak teslim alır.
              </Text>
            </Card>

            <FormSelect
              label="Hedef personel (opsiyonel)"
              value={toEmployeeId}
              options={employeeOptions}
              onChange={setToEmployeeId}
            />
            <FormSelect label="Geçerlilik süresi" value={expiry} options={EXPIRY_OPTIONS} onChange={setExpiry} />

            <Button title="Devri Başlat" icon="send" fullWidth loading={busy} onPress={start} style={{ marginTop: t.spacing[2] }} />
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
