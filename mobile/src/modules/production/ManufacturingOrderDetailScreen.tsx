// Üretim Emri detayı — hero + cost breakdown (tahmini/gerçek), bileşenler
// (gerekli/rezerve/tüketilen), İş Emirleri (tap → saha terminali) and the lifecycle
// action buttons: Onayla (draft→confirmed, explode+reserve) · Tamamla (üretimi
// bitir: consume+produce+cost) · İptal (reverse stock) · Sil (draft). Actions are
// gated by status + the specific production.orders.* permission, mirroring the
// orders detail screen. Tamamla opens a bottom-sheet for produced/scrapped qty.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  IamPermissions,
  PRODUCTION_PRIORITY_LABELS,
  ProductionPermissions,
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
import {
  MO_STATUS_TONES,
  PRIORITY_TONES,
  PRODUCTION_ORDER_STATUS_LABELS,
  WO_STATUS_ICONS,
  WO_STATUS_TONES,
  WORK_ORDER_STATUS_LABELS,
  formatMoney,
  formatQty,
} from './format'

export function ManufacturingOrderDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()

  const canRead = hasPermission(ProductionPermissions.read)
  const canWrite = hasPermission(ProductionPermissions.ordersWrite)
  const canConfirm = hasPermission(ProductionPermissions.ordersConfirm)
  const canComplete = hasPermission(ProductionPermissions.ordersComplete)
  const canCancel = hasPermission(ProductionPermissions.ordersCancel)
  const canAudit = hasPermission(IamPermissions.auditRead)

  const id = String(nav.current.params?.id ?? '')
  const order = useAsync(() => api.production.orders.get(id), [id], { enabled: canRead && !!id })
  const { submit, busy } = useSubmit()
  const [completeOpen, setCompleteOpen] = React.useState(false)

  const doc = order.data

  const handleConfirm = () =>
    confirmDestructive(
      'Emri Onayla',
      'Reçete patlatılacak: bileşenler rezerve edilecek ve iş emirleri oluşturulacak. Devam edilsin mi?',
      () =>
        void submit(
          async () => {
            await api.production.orders.confirm(id)
            order.refetch()
          },
          { errorTitle: 'Onaylanamadı' },
        ),
      'Onayla',
    )

  const handleCancel = () =>
    confirmDestructive(
      'Emri İptal Et',
      'Üretim emri iptal edilecek ve stok hareketleri geri alınacak. Devam edilsin mi?',
      () =>
        void submit(
          async () => {
            await api.production.orders.cancel(id)
            order.refetch()
          },
          { errorTitle: 'İptal edilemedi' },
        ),
      'İptal et',
    )

  const handleDelete = () =>
    confirmDestructive('Taslağı sil', 'Bu taslak üretim emri silinecek. Devam edilsin mi?', () =>
      void submit(
        async () => {
          await api.production.orders.remove(id)
          nav.goBack()
        },
        { errorTitle: 'Silinemedi' },
      ),
    )

  if (!canRead) {
    return (
      <Screen header={{ title: 'Üretim Emri', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  const isDraft = doc?.status === 'draft'
  const isConfirmed = doc?.status === 'confirmed'
  const isInProgress = doc?.status === 'in_progress'
  const isDone = doc?.status === 'done'

  const showConfirm = !!doc && canConfirm && isDraft
  const showComplete = !!doc && canComplete && (isConfirmed || isInProgress)
  const showCancel = !!doc && canCancel && (isConfirmed || isInProgress)
  const showDelete = !!doc && canWrite && isDraft
  const hasActions = showConfirm || showComplete || showCancel || showDelete

  // Cost breakdown: show planned (std) figures until the order is done, then actual.
  const material = doc ? (isDone ? doc.actualMaterialCost : doc.stdMaterialCost) : 0
  const operation = doc ? (isDone ? doc.actualOperationCost : doc.stdOperationCost) : 0
  const overhead = doc ? (isDone ? doc.actualOverheadCost : doc.stdOverheadCost) : 0

  return (
    <Screen
      header={{
        title: doc?.orderNo || 'Üretim Emri',
        subtitle: doc ? doc.productName : undefined,
        onBack: nav.goBack,
        right: doc ? (
          <>
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() =>
                  nav.navigate('iam.audit.entity', { entityType: 'ManufacturingOrder', entityId: id }, 'Denetim')
                }
              />
            ) : null}
            {canWrite && isDraft ? (
              <HeaderAction icon="edit-2" onPress={() => nav.navigate('production.order.entry', { id }, 'Emri düzenle')} />
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
              <Button title="Onayla" icon="check" fullWidth loading={busy} onPress={handleConfirm} />
            ) : null}
            {showComplete ? (
              <Button title="Tamamla" icon="check-circle" fullWidth loading={busy} onPress={() => setCompleteOpen(true)} />
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
          description={order.error ?? 'Üretim emri bulunamadı.'}
          actionLabel="Tekrar dene"
          onAction={order.refetch}
        />
      ) : (
        <>
          <Card>
            <View style={{ gap: t.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="overline" tone="muted">
                  Üretim Emri
                </Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Badge label={PRODUCTION_PRIORITY_LABELS[doc.priority]} tone={PRIORITY_TONES[doc.priority]} />
                  <Badge label={PRODUCTION_ORDER_STATUS_LABELS[doc.status]} tone={MO_STATUS_TONES[doc.status]} />
                </View>
              </View>
              <Text variant="h1">{doc.productName}</Text>
              <Text variant="caption" tone="muted">
                {formatQty(doc.plannedQuantity)} {doc.unit} planlandı · {formatQty(doc.producedQuantity)} üretildi
                {doc.scrappedQuantity > 0 ? ` · ${formatQty(doc.scrappedQuantity)} fire` : ''}
              </Text>
            </View>
          </Card>

          <Section title="Genel">
            <Card>
              <FieldGrid>
                <Field label="Ürün" value={doc.productName} full />
                <Field label="Emir No" value={doc.orderNo} mono />
                <Field label="Reçete" value={doc.bomCode ? `${doc.bomCode}${doc.bomVersion ? ` v${doc.bomVersion}` : ''}` : '—'} />
                <Field label="Planlanan" value={`${formatQty(doc.plannedQuantity)} ${doc.unit}`} />
                <Field label="Üretilen" value={`${formatQty(doc.producedQuantity)} ${doc.unit}`} />
                <Field label="Fire" value={`${formatQty(doc.scrappedQuantity)} ${doc.unit}`} />
                <Field label="Kaynak" value={doc.sourceMode === 'mto' ? 'Siparişe (MTO)' : 'Stoğa (MTS)'} />
                <Field label="Öncelik" value={PRODUCTION_PRIORITY_LABELS[doc.priority]} />
                {doc.dueDate ? <Field label="Termin" value={formatDate(doc.dueDate)} /> : null}
                {doc.plannedStartDate ? <Field label="Planlı Başlangıç" value={formatDate(doc.plannedStartDate)} /> : null}
                {doc.actualStartDate ? <Field label="Gerçek Başlangıç" value={formatDate(doc.actualStartDate)} /> : null}
                {doc.actualEndDate ? <Field label="Tamamlanma" value={formatDate(doc.actualEndDate)} /> : null}
                {doc.notes ? <Field label="Notlar" value={doc.notes} full /> : null}
              </FieldGrid>
            </Card>
          </Section>

          <Section title={isDone ? 'Maliyet (Gerçek)' : 'Maliyet (Tahmini)'}>
            <Card>
              <View style={{ gap: t.spacing[2.5] }}>
                <CostRow label="Malzeme" value={formatMoney(material, doc.currency)} />
                <CostRow label="Operasyon" value={formatMoney(operation, doc.currency)} />
                {overhead > 0 ? <CostRow label="Genel Gider" value={formatMoney(overhead, doc.currency)} /> : null}
                {doc.subcontractServiceCost > 0 ? (
                  <CostRow label="Fason İşçilik" value={formatMoney(doc.subcontractServiceCost, doc.currency)} />
                ) : null}
                {doc.byproductCredit > 0 ? (
                  <CostRow label="Yan Ürün Kredisi" value={`- ${formatMoney(doc.byproductCredit, doc.currency)}`} />
                ) : null}
                <View style={{ height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing[1] }} />
                <CostRow label="Toplam Maliyet" value={formatMoney(doc.totalCost, doc.currency)} bold />
                <CostRow label="Birim Maliyet" value={formatMoney(doc.unitCost, doc.currency)} />
              </View>
            </Card>
          </Section>

          <Section title={`Bileşenler (${doc.components.length})`}>
            {doc.components.length === 0 ? (
              <EmptyState icon="list" title="Bileşen yok" description="Onaylandığında reçeteden patlatılır." />
            ) : (
              <ListCard>
                {doc.components.map((c) => (
                  <ListRow
                    key={c.id}
                    icon="package"
                    title={c.componentName}
                    subtitle={`Gerekli ${formatQty(c.requiredQuantity)} · Rezerve ${formatQty(c.reservedQuantity)} · Tüketilen ${formatQty(c.consumedQuantity)} ${c.unit}`}
                    trailing={
                      c.totalCost != null ? (
                        <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                          {formatMoney(c.totalCost, doc.currency)}
                        </Text>
                      ) : c.isOptional ? (
                        <Badge label="Opsiyonel" tone="muted" />
                      ) : undefined
                    }
                  />
                ))}
              </ListCard>
            )}
          </Section>

          {doc.workOrders.length > 0 ? (
            <Section title={`İş Emirleri (${doc.workOrders.length})`}>
              <ListCard>
                {doc.workOrders.map((wo) => (
                  <ListRow
                    key={wo.id}
                    icon={WO_STATUS_ICONS[wo.status]}
                    title={`${wo.sequence}. ${wo.name}`}
                    subtitle={`${wo.workCenterName} · ${formatQty(wo.producedQuantity)}/${formatQty(wo.plannedQuantity)} ${wo.unit}`}
                    trailing={<Badge label={WORK_ORDER_STATUS_LABELS[wo.status]} tone={WO_STATUS_TONES[wo.status]} />}
                    onPress={() => nav.navigate('production.workorder.terminal', { id: wo.id }, `${wo.sequence}. ${wo.name}`)}
                  />
                ))}
              </ListCard>
            </Section>
          ) : null}

          {doc.byproducts.length > 0 ? (
            <Section title={`Yan Ürünler (${doc.byproducts.length})`}>
              <ListCard>
                {doc.byproducts.map((b) => (
                  <ListRow
                    key={b.id}
                    icon="gift"
                    title={b.productName}
                    subtitle={`Beklenen ${formatQty(b.quantity)} · Üretilen ${formatQty(b.producedQuantity)} ${b.unit}`}
                  />
                ))}
              </ListCard>
            </Section>
          ) : null}
        </>
      )}

      {completeOpen && doc ? (
        <CompleteSheet
          plannedQuantity={doc.plannedQuantity}
          unit={doc.unit}
          onClose={() => setCompleteOpen(false)}
          onDone={() => {
            setCompleteOpen(false)
            order.refetch()
          }}
          submit={submit}
          busy={busy}
          id={id}
        />
      ) : null}
    </Screen>
  )
}

function CostRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
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

// ── Tamamla (complete) bottom-sheet ──────────────────────────────────────────
function CompleteSheet({
  id,
  plannedQuantity,
  unit,
  onClose,
  onDone,
  submit,
  busy,
}: {
  id: string
  plannedQuantity: number
  unit: string
  onClose: () => void
  onDone: () => void
  submit: (fn: () => Promise<void>, opts?: { errorTitle?: string }) => Promise<void>
  busy: boolean
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [produced, setProduced] = React.useState(String(plannedQuantity))
  const [scrapped, setScrapped] = React.useState('0')

  const doComplete = () =>
    void submit(
      async () => {
        await api.production.orders.complete(id, {
          producedQuantity: Number(produced) || 0,
          scrappedQuantity: Number(scrapped) || 0,
        })
        onDone()
      },
      { errorTitle: 'Tamamlanamadı' },
    )

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
          <View
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.spacing[4], paddingVertical: t.spacing[3] }}
          >
            <Text variant="title" weight="bold" style={{ flex: 1 }}>
              Üretimi Tamamla
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={24} color={t.colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: t.spacing[4],
              paddingBottom: insets.bottom + t.spacing[4],
              gap: t.spacing[4],
            }}
          >
            <Text variant="caption" tone="muted">
              Bileşenler tüketilecek, mamul stok girişi yapılacak ve maliyet hesaplanacak.
            </Text>
            <Input label={`Üretilen Miktar (${unit})`} keyboardType="numeric" value={produced} onChangeText={setProduced} />
            <Input label={`Fire Miktarı (${unit})`} keyboardType="numeric" value={scrapped} onChangeText={setScrapped} />
            <Button title="Tamamla" icon="check-circle" fullWidth loading={busy} onPress={doComplete} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
