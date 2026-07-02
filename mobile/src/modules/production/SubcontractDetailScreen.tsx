// Fason sevk detayı — genel bilgiler, gönderilen kalemler (gönderilen/iade/
// fasoncuda) ve durum bazlı aksiyonlar: Sevk Et → Teslim Al (işçilik ile) → İptal.
// Mirrors OrderDetailScreen; teslim alma için CreateCountSheet tarzı bir alt sayfa.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { ProductionPermissions } from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  Icon,
  Input,
  ListCard,
  ListRow,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney, formatQty, SUBCONTRACT_DISPATCH_STATUS_LABELS, SUBCONTRACT_STATUS_TONES } from './format'

export function SubcontractDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canManage = hasPermission(ProductionPermissions.subcontractManage)

  const id = String(nav.current.params?.id ?? '')
  const d = useAsync(() => api.production.subcontract.get(id), [id], { enabled: canRead && !!id })
  const { submit, busy } = useSubmit()
  const doc = d.data

  const [receiveOpen, setReceiveOpen] = React.useState(false)
  const [receiveCost, setReceiveCost] = React.useState('0')

  React.useEffect(() => {
    if (doc) setReceiveCost(String(doc.serviceCost ?? 0))
  }, [doc])

  if (!canRead) {
    return (
      <Screen header={{ title: 'Fason Detayı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  const handleSend = () =>
    confirmDestructive(
      'Fason sevk',
      'Malzeme fasoncuya gönderilecek ve stok hareketi oluşacak. Devam edilsin mi?',
      () =>
        void submit(
          async () => {
            await api.production.subcontract.send(id)
            d.refetch()
          },
          { errorTitle: 'Sevk edilemedi' },
        ),
      'Sevk et',
    )

  const handleReceive = () =>
    void submit(
      async () => {
        await api.production.subcontract.receive(id, { serviceCost: Number(receiveCost) || 0 })
        setReceiveOpen(false)
        d.refetch()
      },
      { errorTitle: 'Teslim alınamadı' },
    )

  const handleCancel = () =>
    confirmDestructive(
      'Fason sevki iptal et',
      'Bu fason sevk iptal edilecek. Devam edilsin mi?',
      () =>
        void submit(
          async () => {
            await api.production.subcontract.cancel(id)
            d.refetch()
          },
          { errorTitle: 'İptal edilemedi' },
        ),
      'İptal et',
    )

  const isDraft = doc?.status === 'draft'
  const isSent = doc?.status === 'sent'
  const showSend = !!doc && canManage && isDraft
  const showReceive = !!doc && canManage && isSent
  const showCancel = !!doc && canManage && (isDraft || isSent)
  const hasActions = showSend || showReceive || showCancel

  return (
    <Screen
      header={{
        title: doc?.dispatchNo || 'Fason',
        subtitle: doc?.contactName,
        onBack: nav.goBack,
      }}
      onRefresh={d.refetch}
      refreshing={d.refreshing}
      footer={
        doc && hasActions ? (
          <View style={{ gap: t.spacing[2.5] }}>
            {showSend ? (
              <Button title="Sevk Et" icon="send" fullWidth loading={busy} onPress={handleSend} />
            ) : null}
            {showReceive ? (
              <Button title="Teslim Al" icon="check" fullWidth loading={busy} onPress={() => setReceiveOpen(true)} />
            ) : null}
            {showCancel ? (
              <Button title="İptal Et" variant="destructive" fullWidth loading={busy} onPress={handleCancel} />
            ) : null}
          </View>
        ) : undefined
      }
    >
      {d.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={26} />
          </View>
        </Card>
      ) : d.error || !doc ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={d.error ?? 'Belge bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={d.refetch}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  Fason Sevk
                </Text>
                <Badge
                  label={SUBCONTRACT_DISPATCH_STATUS_LABELS[doc.status]}
                  tone={SUBCONTRACT_STATUS_TONES[doc.status]}
                />
              </View>
              <Text variant="h1">{doc.contactName}</Text>
              <Text variant="caption" tone="muted">
                {doc.manufacturingOrderNo} · {doc.lines.length} kalem
              </Text>
            </View>
          </Card>

          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Fasoncu" value={doc.contactName} full />
                <Field label="Üretim Emri" value={doc.manufacturingOrderNo} />
                <Field label="Sevk Tarihi" value={formatDate(doc.dispatchDate)} />
                <Field label="Beklenen İade" value={doc.expectedReturnDate ? formatDate(doc.expectedReturnDate) : '—'} />
                <Field label="İşçilik" value={formatMoney(doc.serviceCost, doc.currency)} />
                <Field label="Durum" value={SUBCONTRACT_DISPATCH_STATUS_LABELS[doc.status]} />
                {doc.notes ? <Field label="Notlar" value={doc.notes} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          <Section title={`Kalemler (${doc.lines.length})`}>
            {doc.lines.length === 0 ? (
              <EmptyState icon="list" title="Kalem yok" description="Bu belgede kalem bulunmuyor." />
            ) : (
              <ListCard>
                {doc.lines.map((l) => (
                  <ListRow
                    key={l.id}
                    icon="package"
                    title={l.componentName}
                    subtitle={`Gönderilen ${formatQty(l.sentQuantity)} · İade ${formatQty(l.returnedQuantity)} ${l.unit}`}
                    trailing={
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text weight="bold" style={{ fontFamily: 'monospace' }}>
                          {`${formatQty(l.atSubcontractor)} ${l.unit}`}
                        </Text>
                        <Text variant="caption" tone="muted">
                          fasoncuda
                        </Text>
                      </View>
                    }
                  />
                ))}
              </ListCard>
            )}
          </Section>
        </>
      )}

      <Modal visible={receiveOpen} transparent animationType="slide" onRequestClose={() => setReceiveOpen(false)}>
        <Pressable
          onPress={() => setReceiveOpen(false)}
          style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}
        >
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
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: t.spacing[4],
                paddingVertical: t.spacing[3],
              }}
            >
              <Text variant="title" weight="bold" style={{ flex: 1 }}>
                Teslim Al
              </Text>
              <Pressable onPress={() => setReceiveOpen(false)} hitSlop={8}>
                <Icon name="x" size={24} color={t.colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[6], gap: t.spacing[4] }}
            >
              <Text variant="caption" tone="muted">
                Mamul teslim alınacak; gönderilen malzemenin tamamı kullanılmış sayılır.
              </Text>
              <Input label="İşçilik Ücreti" keyboardType="numeric" value={receiveCost} onChangeText={setReceiveCost} />
              <Button title="Teslim Al" icon="check" fullWidth loading={busy} onPress={handleReceive} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  )
}
