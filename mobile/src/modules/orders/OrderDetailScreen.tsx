import * as React from 'react'
import { View } from 'react-native'
import {
  IamPermissions,
  ORDER_DIRECTION_LABELS,
  OrdersPermissions,
  type OrderKind,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  HeaderAction,
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
import { formatMoney, ORDER_KIND_LABELS, ORDER_STATUS_LABELS, STATUS_TONES } from './format'

// The natural "next kind" in the chain + its convert button label.
const NEXT_KIND_LABEL: Partial<Record<OrderKind, string>> = {
  quote: 'Siparişe Dönüştür',
  order: 'İrsaliyeye Dönüştür',
}

export function OrderDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()

  const canRead = hasPermission(OrdersPermissions.read)
  const canWrite = hasPermission(OrdersPermissions.write)
  const canConfirm = hasPermission(OrdersPermissions.confirm)
  const canConvert = hasPermission(OrdersPermissions.convert)
  const canCancel = hasPermission(OrdersPermissions.cancel)
  const canAudit = hasPermission(IamPermissions.auditRead)

  const id = String(nav.current.params?.id ?? '')
  const order = useAsync(() => api.orders.get(id), [id], { enabled: canRead && !!id })
  const { submit, busy } = useSubmit()

  const doc = order.data

  const handleConfirm = () => {
    if (!doc) return
    const isDelivery = doc.kind === 'delivery'
    confirmDestructive(
      isDelivery ? 'Sevk et' : 'Onayla',
      isDelivery
        ? 'İrsaliye sevk edilecek, numara atanacak ve stok hareketi oluşturulacak. Devam edilsin mi?'
        : 'Belge onaylanacak ve numara atanacak. Devam edilsin mi?',
      () =>
        submit(async () => {
          await api.orders.confirm(id)
          order.refetch()
        }),
      isDelivery ? 'Sevk et' : 'Onayla',
    )
  }

  const handleConvertNext = () =>
    submit(async () => {
      const src = await api.orders.convert(id)
      if (src.targetDocId) nav.navigate('orders.detail', { id: src.targetDocId }, 'Belge')
      else order.refetch()
    })

  const handleInvoice = () =>
    submit(async () => {
      const src = await api.orders.convert(id, { toKind: 'invoice' })
      if (src.invoiceId) nav.navigate('invoices.invoices.detail', { id: src.invoiceId }, 'Fatura')
      else order.refetch()
    })

  const handleCancel = () => {
    confirmDestructive('Belgeyi iptal et', 'Bu belge iptal edilecek. Devam edilsin mi?', () =>
      submit(async () => {
        await api.orders.cancel(id)
        order.refetch()
      }),
      'İptal et',
    )
  }

  const handleDelete = () => {
    confirmDestructive('Taslağı sil', 'Bu taslak belge silinecek. Devam edilsin mi?', () =>
      submit(async () => {
        await api.orders.remove(id)
        nav.goBack()
      }),
    )
  }

  if (!canRead) {
    return (
      <Screen header={{ title: 'Belge Detayı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  // ── Action availability ──
  const isDraft = doc?.status === 'draft'
  const isCancelled = doc?.status === 'cancelled'
  const isInvoiced = doc?.status === 'invoiced'
  const nextLabel = doc ? NEXT_KIND_LABEL[doc.kind] : undefined
  const showConfirm = !!doc && canConfirm && isDraft
  const showConvertNext = !!doc && canConvert && !!nextLabel && !doc.targetDocId && !isDraft && !isCancelled
  const showInvoice = !!doc && canConvert && !doc.invoiceId && !isDraft && !isCancelled && !isInvoiced
  const showCancel = !!doc && canCancel && !isDraft && !isCancelled && !isInvoiced
  const showDelete = !!doc && canWrite && isDraft
  const hasActions = showConfirm || showConvertNext || showInvoice || showCancel || showDelete

  return (
    <Screen
      header={{
        title: doc?.number || 'Taslak',
        subtitle: doc
          ? `${doc.contact?.name ?? 'Cari yok'} · ${ORDER_KIND_LABELS[doc.kind]} · ${ORDER_DIRECTION_LABELS[doc.direction]}`
          : undefined,
        onBack: nav.goBack,
        right: doc ? (
          <>
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() =>
                  nav.navigate('iam.audit.entity', { entityType: 'OrderDocument', entityId: id }, 'Denetim')
                }
              />
            ) : null}
            {canWrite && isDraft ? (
              <HeaderAction
                icon="edit-2"
                onPress={() => nav.navigate('orders.entry', { id }, 'Belge düzenle')}
              />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={order.refetch}
      refreshing={order.refreshing}
      footer={
        doc && hasActions ? (
          <View style={{ gap: t.spacing[2.5] }}>
            {showConfirm ? (
              <Button
                title={doc.kind === 'delivery' ? 'Sevk Et' : 'Onayla'}
                icon="check"
                fullWidth
                loading={busy}
                onPress={handleConfirm}
              />
            ) : null}
            {showConvertNext ? (
              <Button title={nextLabel} icon="arrow-right" fullWidth loading={busy} onPress={handleConvertNext} />
            ) : null}
            {showInvoice ? (
              <Button
                title="Faturalandır"
                icon="file-text"
                variant={showConvertNext ? 'outline' : 'default'}
                fullWidth
                loading={busy}
                onPress={handleInvoice}
              />
            ) : null}
            {showDelete || showCancel ? (
              <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                {showDelete ? (
                  <View style={{ flex: 1 }}>
                    <Button title="Sil" variant="destructive" fullWidth loading={busy} onPress={handleDelete} />
                  </View>
                ) : null}
                {showCancel ? (
                  <View style={{ flex: 1 }}>
                    <Button title="İptal Et" variant="destructive" fullWidth loading={busy} onPress={handleCancel} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : undefined
      }
    >
      {order.loading ? (
        <Card>
          <View style={{ gap: t.spacing[3] }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width="60%" height={26} />
          </View>
        </Card>
      ) : order.error || !doc ? (
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={order.error ?? 'Belge bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={order.refetch}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  Genel Toplam
                </Text>
                <Badge label={ORDER_STATUS_LABELS[doc.status]} tone={STATUS_TONES[doc.status]} />
              </View>
              <Text variant="display" style={{ fontFamily: 'monospace' }}>
                {formatMoney(doc.grandTotal, doc.currencyCode)}
              </Text>
              <Text variant="caption" tone="muted">
                {ORDER_KIND_LABELS[doc.kind]} · {ORDER_DIRECTION_LABELS[doc.direction]} · {doc.lines.length} kalem
              </Text>
            </View>
          </Card>

          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Cari" value={doc.contact?.name ?? '—'} full />
                <Field label="Tarih" value={formatDate(doc.date)} />
                <Field
                  label={doc.kind === 'quote' ? 'Geçerlilik' : 'Vade'}
                  value={
                    doc.kind === 'quote'
                      ? doc.validUntil
                        ? formatDate(doc.validUntil)
                        : '—'
                      : doc.dueDate
                        ? formatDate(doc.dueDate)
                        : '—'
                  }
                />
                <Field label="Tür" value={ORDER_KIND_LABELS[doc.kind]} />
                <Field label="Yön" value={ORDER_DIRECTION_LABELS[doc.direction]} />
                {doc.number ? <Field label="Belge No" value={doc.number} mono /> : null}
                {doc.notes ? <Field label="Notlar" value={doc.notes} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          {doc.sourceDocId || doc.targetDocId || doc.invoiceId ? (
            <Section title="Zincir">
              <ListCard>
                {doc.sourceDocId ? (
                  <ListRow
                    icon="corner-up-left"
                    title="Kaynak belge"
                    subtitle="Bu belgenin oluşturulduğu belge"
                    onPress={() => nav.navigate('orders.detail', { id: doc.sourceDocId }, 'Belge')}
                  />
                ) : null}
                {doc.targetDocId ? (
                  <ListRow
                    icon="corner-up-right"
                    title="Sonraki belge"
                    subtitle="Bu belgeden dönüştürülen belge"
                    onPress={() => nav.navigate('orders.detail', { id: doc.targetDocId }, 'Belge')}
                  />
                ) : null}
                {doc.invoiceId ? (
                  <ListRow
                    icon="file-text"
                    title="Fatura"
                    subtitle="Bu belgeden oluşan fatura"
                    onPress={() => nav.navigate('invoices.invoices.detail', { id: doc.invoiceId }, 'Fatura')}
                  />
                ) : null}
              </ListCard>
            </Section>
          ) : null}

          <Section title={`Kalemler (${doc.lines.length})`}>
            {doc.lines.length === 0 ? (
              <EmptyState icon="list" title="Kalem yok" description="Bu belgede kalem bulunmuyor." />
            ) : (
              <ListCard>
                {doc.lines.map((line) => (
                  <ListRow
                    key={line.id}
                    icon="package"
                    title={line.description}
                    subtitle={`${line.quantity} ${line.unit} × ${formatMoney(line.unitPrice, doc.currencyCode)} · KDV %${line.vatRate}`}
                    trailing={
                      <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {formatMoney(line.lineTotal, doc.currencyCode)}
                      </Text>
                    }
                  />
                ))}
              </ListCard>
            )}
          </Section>

          <Section title="Toplamlar">
            <Card>
              <View style={{ gap: t.spacing[2.5] }}>
                <TotalRow label="Ara Toplam" value={formatMoney(doc.subtotal, doc.currencyCode)} />
                {doc.discountTotal > 0 ? (
                  <TotalRow label="İskonto" value={`- ${formatMoney(doc.discountTotal, doc.currencyCode)}`} />
                ) : null}
                {doc.vatSummary.map((row) => (
                  <TotalRow key={row.rate} label={`KDV %${row.rate}`} value={formatMoney(row.vat, doc.currencyCode)} />
                ))}
                {doc.withholdingTotal > 0 ? (
                  <TotalRow label="Tevkifat" value={`- ${formatMoney(doc.withholdingTotal, doc.currencyCode)}`} />
                ) : null}
                <View style={{ height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing[1] }} />
                <TotalRow label="Genel Toplam" value={formatMoney(doc.grandTotal, doc.currencyCode)} bold />
              </View>
            </Card>
          </Section>
        </>
      )}
    </Screen>
  )
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant={bold ? 'title' : 'label'} tone={bold ? 'default' : 'muted'} weight={bold ? 'bold' : 'medium'}>
        {label}
      </Text>
      <Text variant={bold ? 'title' : 'label'} weight={bold ? 'bold' : 'medium'} style={{ fontFamily: 'monospace' }}>
        {value}
      </Text>
    </View>
  )
}
