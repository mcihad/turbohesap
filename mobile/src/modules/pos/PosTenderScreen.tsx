// POS tender screen — take payment(s) against an existing order and settle it.
// Reached from the sell cart's "Tahsil Et" (which first persists the order).
//
// Split modes:
//   • Hepsi        → one payment for the whole remaining balance.
//   • Tutara göre  → enter a partial amount; repeat until the balance clears.
//   • Eşit böl     → split the grand total into N equal shares; each "Öde" takes
//                    one share (capped at the remaining balance).
//   • Ürün seç     → a qty-N line is expanded into N individually selectable
//                    units (each valued lineTotal/qty). Tick the units one payer
//                    is covering; "Öde" charges their combined value with the
//                    chosen method, so separate people can pay for separate units.
//
// Each payment chooses a method: Nakit (cash account, supports verilen→para üstü),
// Kart (bank account), or Cari (contact). addPayment auto-settles when fully paid.

import * as React from 'react'
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native'

import {
  type PosOrderDto,
  type PosOrderLineDto,
  type PosPaymentMethod,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  CheckBox,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  Icon,
  Input,
  Screen,
  SegmentedControl,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './format'

type SplitMode = 'all' | 'amount' | 'equal' | 'items'
type Method = Extract<PosPaymentMethod, 'cash' | 'card' | 'account'>

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function PosTenderScreen() {
  const t = useTheme()
  const nav = useNav()
  const orderId = nav.current.params?.id ? String(nav.current.params.id) : null
  const { submit, busy } = useSubmit()

  const orderQ = useAsync<PosOrderDto>(() => api.pos.orders.get(orderId as string), [orderId], { enabled: !!orderId })
  const cash = useAsync(() => api.finance.cashAccounts.list(), [])
  const bank = useAsync(() => api.finance.bankAccounts.list(), [])
  const contacts = useAsync(() => api.contacts.contacts.list(), [])

  const order = orderQ.data
  const currency = order?.currencyCode || 'TRY'
  const remaining = order?.remainingTotal ?? 0
  const grand = order?.grandTotal ?? 0

  const [splitMode, setSplitMode] = React.useState<SplitMode>('all')
  const [method, setMethod] = React.useState<Method>('cash')
  const [cashAccountId, setCashAccountId] = React.useState<string | null>(null)
  const [bankAccountId, setBankAccountId] = React.useState<string | null>(null)
  const [contactId, setContactId] = React.useState<string | null>(null)
  const [amountStr, setAmountStr] = React.useState('')
  const [tenderedStr, setTenderedStr] = React.useState('')
  const [equalN, setEqualN] = React.useState(2)
  // Per-unit selection in "Ürün seç" mode. Keyed `${lineId}:${unitIndex}`.
  const [selectedUnitIds, setSelectedUnitIds] = React.useState<string[]>([])
  const [returnOpen, setReturnOpen] = React.useState(false)

  // Bundle children are server-generated lines indented under their parent; they
  // are not split individually (the parent carries them).
  const childrenByParent = React.useMemo(() => {
    const m = new Map<string, PosOrderLineDto[]>()
    for (const l of order?.lines ?? []) {
      if (l.isBundleChild && l.bundleParentLineId) {
        const arr = m.get(l.bundleParentLineId) ?? []
        arr.push(l)
        m.set(l.bundleParentLineId, arr)
      }
    }
    return m
  }, [order?.lines])
  const parentLines = React.useMemo(
    () => (order?.lines ?? []).filter((l) => !l.isBundleChild),
    [order?.lines],
  )

  // Per-unit value of a parent line for split-by-item: the line's own total plus
  // its bundle children's totals (their value travels with the parent), divided
  // by the line qty. Unrounded so a full selection sums back to the line total.
  const unitValueOf = React.useCallback(
    (line: PosOrderLineDto): number => {
      const kids = childrenByParent.get(line.id) ?? []
      const kidsTotal = kids.reduce((s, c) => s + c.lineTotal, 0)
      const units = Math.max(1, Math.round(line.qty))
      return (line.lineTotal + kidsTotal) / units
    },
    [childrenByParent],
  )

  // Sum of the currently selected units (rounded once at the end to avoid drift).
  const itemsAmount = React.useMemo(() => {
    let sum = 0
    for (const line of parentLines) {
      const units = Math.max(1, Math.round(line.qty))
      const value = unitValueOf(line)
      for (let i = 0; i < units; i++) {
        if (selectedUnitIds.includes(`${line.id}:${i}`)) sum += value
      }
    }
    return round2(sum)
  }, [parentLines, selectedUnitIds, unitValueOf])

  // Default account selections once lists load.
  React.useEffect(() => {
    if (cashAccountId == null && cash.data?.length) setCashAccountId(cash.data[0].id)
  }, [cash.data, cashAccountId])
  React.useEffect(() => {
    if (bankAccountId == null && bank.data?.length) setBankAccountId(bank.data[0].id)
  }, [bank.data, bankAccountId])
  React.useEffect(() => {
    if (contactId == null && order?.contactId) setContactId(order.contactId)
  }, [order?.contactId, contactId])

  // Keep the amount field in sync with the remaining balance for "Tutara göre".
  React.useEffect(() => {
    setAmountStr(remaining > 0 ? String(remaining) : '')
  }, [remaining])

  const equalShare = equalN > 0 ? Math.min(round2(grand / equalN), remaining) : 0

  const payAmount = React.useMemo(() => {
    if (splitMode === 'all') return remaining
    if (splitMode === 'equal') return equalShare
    if (splitMode === 'items') return itemsAmount
    const n = Number(amountStr.replace(',', '.'))
    return isNaN(n) ? 0 : round2(n)
  }, [splitMode, remaining, equalShare, itemsAmount, amountStr])

  const tendered = React.useMemo(() => {
    const n = Number(tenderedStr.replace(',', '.'))
    return isNaN(n) || n <= 0 ? null : round2(n)
  }, [tenderedStr])

  const change = method === 'cash' && tendered != null ? Math.max(0, round2(tendered - payAmount)) : 0

  const accountValid =
    method === 'cash' ? !!cashAccountId : method === 'card' ? !!bankAccountId : !!contactId
  const canPay = payAmount > 0 && payAmount <= remaining + 0.001 && accountValid && remaining > 0

  const addPayment = () => {
    if (!order) return
    void submit(
      async () => {
        const updated = await api.pos.orders.addPayment(order.id, {
          method,
          amount: payAmount,
          cashAccountId: method === 'cash' ? cashAccountId : undefined,
          bankAccountId: method === 'card' ? bankAccountId : undefined,
          contactId: method === 'account' ? contactId : undefined,
          tendered: method === 'cash' && tendered != null ? tendered : undefined,
        })
        setTenderedStr('')
        setSelectedUnitIds([])
        orderQ.refetch()
        // Non-blocking recipe/stock warnings (e.g. an ingredient driven negative).
        if (updated.stockWarnings?.length) {
          Alert.alert('Stok uyarısı', updated.stockWarnings.join('\n'))
        }
        if (updated.status === 'paid' || updated.remainingTotal <= 0) {
          nav.goBack()
        }
      },
      { errorTitle: 'Ödeme eklenemedi' },
    )
  }

  const removePayment = (paymentId: string) => {
    if (!order) return
    confirmDestructive('Ödemeyi sil', 'Bu ödeme kaydı silinsin mi?', () => {
      void submit(() => api.pos.orders.removePayment(order.id, paymentId).then(() => undefined), {
        onSuccess: orderQ.refetch,
        errorTitle: 'Ödeme silinemedi',
      })
    })
  }

  const toggleUnit = (unitId: string) =>
    setSelectedUnitIds((cur) => (cur.includes(unitId) ? cur.filter((id) => id !== unitId) : [...cur, unitId]))

  // İade (geri giriş) — return picked returnable units back to stock.
  const submitReturn = (lines: { lineId: string; qty: number }[], reason: string, refund: boolean) => {
    if (!order || lines.length === 0) return
    void submit(
      async () => {
        await api.pos.orders.returnLines(order.id, {
          lines,
          reason: reason.trim() || undefined,
          refund,
        })
        setReturnOpen(false)
        orderQ.refetch()
      },
      { errorTitle: 'İade başarısız' },
    )
  }

  if (!orderId) {
    return (
      <Screen header={{ title: 'Tahsilat', onBack: nav.goBack }}>
        <EmptyState icon="alert-triangle" title="Sipariş bulunamadı" />
      </Screen>
    )
  }

  if (orderQ.loading) {
    return (
      <Screen header={{ title: 'Tahsilat', onBack: nav.goBack }}>
        <SkeletonRows count={6} />
      </Screen>
    )
  }

  if (!order) {
    return (
      <Screen header={{ title: 'Tahsilat', onBack: nav.goBack }}>
        <EmptyState
          icon="alert-triangle"
          tone="destructive"
          title="Yüklenemedi"
          description={orderQ.error ?? undefined}
          actionLabel="Tekrar dene"
          onAction={orderQ.refetch}
        />
      </Screen>
    )
  }

  const settled = order.status === 'paid' || remaining <= 0
  const returnableLines = order.lines.filter((l) => l.returnable && l.returnedQty < l.qty)

  return (
    <Screen
      header={{ title: `Tahsilat · ${order.orderNo}`, onBack: nav.goBack }}
      onRefresh={orderQ.refetch}
      refreshing={orderQ.refreshing}
      footer={
        settled ? (
          <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
            {returnableLines.length > 0 ? (
              <Button
                title="İade"
                icon="corner-up-left"
                variant="outline"
                onPress={() => setReturnOpen(true)}
                style={{ flex: 1 }}
              />
            ) : null}
            <Button title="Bitti" icon="check" onPress={nav.goBack} style={{ flex: 1 }} />
          </View>
        ) : (
          <Button
            title={`Öde · ${formatMoney(payAmount, currency)}`}
            icon="credit-card"
            fullWidth
            loading={busy}
            disabled={!canPay}
            onPress={addPayment}
          />
        )
      }
    >
      {/* Totals */}
      <Card style={{ gap: t.spacing[2], padding: t.spacing[4] }}>
        <Row label="Genel toplam" value={formatMoney(grand, currency)} />
        <Row label="Ödenen" value={formatMoney(order.paidTotal, currency)} tone="success" />
        <View style={{ height: 1, backgroundColor: t.colors.border, marginVertical: t.spacing[1] }} />
        <Row
          label="Kalan"
          value={formatMoney(remaining, currency)}
          big
          tone={settled ? 'success' : 'default'}
        />
        {order.changeDue > 0 ? <Row label="Para üstü" value={formatMoney(order.changeDue, currency)} tone="warning" /> : null}
      </Card>

      {settled ? (
        <Card style={{ alignItems: 'center', gap: t.spacing[2], padding: t.spacing[5] }}>
          <Icon name="check-circle" size={36} color={t.colors.success} />
          <Text variant="title" weight="bold">
            Tahsilat tamamlandı
          </Text>
        </Card>
      ) : (
        <>
          {/* Split mode */}
          <SegmentedControl<SplitMode>
            value={splitMode}
            onChange={setSplitMode}
            options={[
              { value: 'all', label: 'Hepsi' },
              { value: 'amount', label: 'Tutara göre' },
              { value: 'equal', label: 'Eşit böl' },
              { value: 'items', label: 'Ürün seç' },
            ]}
          />

          {splitMode === 'amount' ? (
            <Input
              label="Tutar"
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="decimal-pad"
              placeholder={String(remaining)}
            />
          ) : null}

          {splitMode === 'equal' ? (
            <Card style={{ gap: t.spacing[3], padding: t.spacing[4] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="label" weight="medium">
                  Kişi sayısı
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
                  <Pressable onPress={() => setEqualN((n) => Math.max(2, n - 1))} hitSlop={8}>
                    <Icon name="minus-circle" size={28} color={t.colors.mutedForeground} />
                  </Pressable>
                  <Text variant="title" weight="bold" style={{ minWidth: 28, textAlign: 'center' }}>
                    {equalN}
                  </Text>
                  <Pressable onPress={() => setEqualN((n) => n + 1)} hitSlop={8}>
                    <Icon name="plus-circle" size={28} color={t.colors.primary} />
                  </Pressable>
                </View>
              </View>
              <Row label="Kişi başı" value={formatMoney(equalShare, currency)} tone="primary" />
              <Text variant="caption" tone="muted">
                Her "Öde" bir payı tahsil eder; kalan bittiğinde sipariş kapanır.
              </Text>
            </Card>
          ) : null}

          {splitMode === 'items' ? (
            <Card style={{ gap: t.spacing[2], padding: t.spacing[3] }}>
              <Text variant="overline" tone="muted">
                Ödenecek birimler
              </Text>
              {parentLines.map((line) => {
                const kids = childrenByParent.get(line.id) ?? []
                const units = Math.max(1, Math.round(line.qty))
                const value = unitValueOf(line)
                return (
                  <View key={line.id}>
                    {Array.from({ length: units }).map((_, i) => {
                      const unitId = `${line.id}:${i}`
                      const on = selectedUnitIds.includes(unitId)
                      return (
                        <Pressable
                          key={unitId}
                          onPress={() => toggleUnit(unitId)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], paddingVertical: t.spacing[2] }}
                        >
                          <CheckBox checked={on} />
                          <View style={{ flex: 1 }}>
                            <Text variant="body" weight="medium" numberOfLines={1}>
                              {line.name}
                              {units > 1 ? ` (${i + 1}/${units})` : ''}
                            </Text>
                            {line.modifiers.length > 0 ? (
                              <Text variant="caption" tone="muted" numberOfLines={1}>
                                {line.modifiers.map((m) => m.optionNameSnapshot).join(', ')}
                              </Text>
                            ) : null}
                          </View>
                          <Text variant="label" weight="semibold">
                            {formatMoney(round2(value), currency)}
                          </Text>
                        </Pressable>
                      )
                    })}
                    {kids.map((c) => (
                      <View
                        key={c.id}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2], paddingLeft: t.spacing[8] }}
                      >
                        <Icon name="corner-down-right" size={13} color={t.colors.mutedForeground} />
                        <Text variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
                          {c.qty}× {c.name}
                        </Text>
                        <Text variant="caption" tone="muted">
                          paket
                        </Text>
                      </View>
                    ))}
                  </View>
                )
              })}
              <Text variant="caption" tone="muted">
                Seçili birimlerin toplamı aşağıdaki yöntemle tahsil edilir; her kişi
                kendi birimlerini öder.
              </Text>
            </Card>
          ) : null}

          {/* Payment method — shown for every split mode (incl. per-unit items). */}
          <Card style={{ gap: t.spacing[3], padding: t.spacing[4] }}>
              <SegmentedControl<Method>
                value={method}
                onChange={setMethod}
                options={[
                  { value: 'cash', label: 'Nakit', icon: 'dollar-sign' },
                  { value: 'card', label: 'Kart', icon: 'credit-card' },
                  { value: 'account', label: 'Cari', icon: 'user' },
                ]}
              />

              {method === 'cash' ? (
                <>
                  <FormSelect
                    label="Kasa hesabı"
                    value={cashAccountId ?? ''}
                    onChange={setCashAccountId}
                    options={(cash.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
                  />
                  <Input
                    label="Verilen (para üstü için)"
                    value={tenderedStr}
                    onChangeText={setTenderedStr}
                    keyboardType="decimal-pad"
                    placeholder={String(payAmount)}
                  />
                  {change > 0 ? <Row label="Para üstü" value={formatMoney(change, currency)} tone="warning" /> : null}
                  {(cash.data ?? []).length === 0 ? (
                    <Text variant="caption" tone="destructive">
                      Nakit için bir kasa hesabı gerekli.
                    </Text>
                  ) : null}
                </>
              ) : null}

              {method === 'card' ? (
                <>
                  <FormSelect
                    label="Banka hesabı"
                    value={bankAccountId ?? ''}
                    onChange={setBankAccountId}
                    options={(bank.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
                  />
                  {(bank.data ?? []).length === 0 ? (
                    <Text variant="caption" tone="destructive">
                      Kart için bir banka hesabı gerekli.
                    </Text>
                  ) : null}
                </>
              ) : null}

              {method === 'account' ? (
                <>
                  <FormSelect
                    label="Cari (kişi/firma)"
                    value={contactId ?? ''}
                    onChange={setContactId}
                    options={(contacts.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
                  />
                  {(contacts.data ?? []).length === 0 ? (
                    <Text variant="caption" tone="destructive">
                      Cari/hesaba için bir kişi seçin.
                    </Text>
                  ) : null}
                </>
              ) : null}
          </Card>
        </>
      )}

      {/* Payments so far */}
      {order.payments.length > 0 ? (
        <Card style={{ gap: t.spacing[2], padding: t.spacing[3] }}>
          <Text variant="overline" tone="muted">
            Ödemeler
          </Text>
          {order.payments.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
              <Badge
                label={p.method === 'cash' ? 'Nakit' : p.method === 'card' ? 'Kart' : p.method === 'account' ? 'Cari' : 'Diğer'}
                tone="muted"
              />
              <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {p.accountName ?? '—'}
                {p.changeGiven > 0 ? ` · p.üstü ${formatMoney(p.changeGiven, currency)}` : ''}
              </Text>
              <Text variant="label" weight="semibold">
                {formatMoney(p.amount, currency)}
              </Text>
              {!settled ? (
                <Pressable onPress={() => removePayment(p.id)} hitSlop={8}>
                  <Icon name="trash-2" size={16} color={t.colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      {/* Already returned units (geri giriş) */}
      {order.lines.some((l) => l.returnedQty > 0) ? (
        <Card style={{ gap: t.spacing[2], padding: t.spacing[3] }}>
          <Text variant="overline" tone="muted">
            İade edilenler
          </Text>
          {order.lines
            .filter((l) => l.returnedQty > 0)
            .map((l) => (
              <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                <Icon name="corner-up-left" size={15} color={t.colors.mutedForeground} />
                <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                  {l.name}
                </Text>
                <Badge label={`${l.returnedQty}/${l.qty}`} tone="muted" />
              </View>
            ))}
        </Card>
      ) : null}

      <ReturnModal
        visible={returnOpen}
        lines={returnableLines}
        currency={currency}
        busy={busy}
        onClose={() => setReturnOpen(false)}
        onSubmit={submitReturn}
      />
    </Screen>
  )
}

// ── İade (geri giriş) sheet ───────────────────────────────────────────────
function ReturnModal({
  visible,
  lines,
  currency,
  busy,
  onClose,
  onSubmit,
}: {
  visible: boolean
  lines: PosOrderLineDto[]
  currency: string
  busy: boolean
  onClose: () => void
  onSubmit: (lines: { lineId: string; qty: number }[], reason: string, refund: boolean) => void
}) {
  const t = useTheme()
  const [qtys, setQtys] = React.useState<Record<string, number>>({})
  const [reason, setReason] = React.useState('')
  const [refund, setRefund] = React.useState(false)

  // Seed each line with its full returnable remainder whenever the sheet opens.
  React.useEffect(() => {
    if (!visible) return
    const init: Record<string, number> = {}
    for (const l of lines) init[l.id] = Math.max(0, Math.round(l.qty - l.returnedQty))
    setQtys(init)
    setReason('')
    setRefund(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const maxFor = (l: PosOrderLineDto) => Math.max(0, Math.round(l.qty - l.returnedQty))
  const clamp = (l: PosOrderLineDto, n: number) => Math.min(maxFor(l), Math.max(0, n))
  const setQty = (l: PosOrderLineDto, n: number) => setQtys((cur) => ({ ...cur, [l.id]: clamp(l, n) }))

  const picked = lines
    .map((l) => ({ lineId: l.id, qty: qtys[l.id] ?? 0 }))
    .filter((x) => x.qty > 0)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            maxHeight: '88%',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: t.spacing[3] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.spacing[4], paddingVertical: t.spacing[3] }}>
            <Text variant="title" weight="bold" style={{ flex: 1 }}>
              İade (geri giriş)
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={24} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[4], gap: t.spacing[3] }}>
            {lines.length === 0 ? (
              <EmptyState icon="corner-up-left" title="İade edilebilir ürün yok" />
            ) : (
              lines.map((l) => {
                const max = maxFor(l)
                const q = qtys[l.id] ?? 0
                return (
                  <View
                    key={l.id}
                    style={{
                      gap: t.spacing[2],
                      padding: t.spacing[3],
                      borderRadius: t.radius.md,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                      <Text variant="body" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                        {l.name}
                        {l.isBundleChild ? ' (paket)' : ''}
                      </Text>
                      <Text variant="caption" tone="muted">
                        en fazla {max}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
                      <Pressable onPress={() => setQty(l, q - 1)} hitSlop={8}>
                        <Icon name="minus-circle" size={28} color={t.colors.mutedForeground} />
                      </Pressable>
                      <Text variant="title" weight="bold" style={{ minWidth: 28, textAlign: 'center' }}>
                        {q}
                      </Text>
                      <Pressable onPress={() => setQty(l, q + 1)} hitSlop={8}>
                        <Icon name="plus-circle" size={28} color={t.colors.primary} />
                      </Pressable>
                      <View style={{ flex: 1 }} />
                      <Text variant="label" weight="semibold">
                        {formatMoney(l.lineTotal, currency)}
                      </Text>
                    </View>
                  </View>
                )
              })
            )}

            {lines.length > 0 ? (
              <>
                <Input label="Açıklama (opsiyonel)" value={reason} onChangeText={setReason} placeholder="örn. Müşteri kullanmadı" />
                <FormSwitchRow
                  label="Tutarı da iade et (kasadan)"
                  value={refund}
                  onValueChange={setRefund}
                />
              </>
            ) : null}
          </ScrollView>

          <View style={{ padding: t.spacing[4], borderTopWidth: 1, borderTopColor: t.colors.border }}>
            <Button
              title={`İadeyi onayla (${picked.reduce((s, x) => s + x.qty, 0)})`}
              icon="corner-up-left"
              fullWidth
              loading={busy}
              disabled={picked.length === 0}
              onPress={() => onSubmit(picked, reason, refund)}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function Row({
  label,
  value,
  tone = 'default',
  big = false,
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning' | 'primary'
  big?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text variant={big ? 'title' : 'body'} weight={big ? 'bold' : 'normal'} tone="muted">
        {label}
      </Text>
      <Text variant={big ? 'h2' : 'label'} weight={big ? 'bold' : 'semibold'} tone={tone}>
        {value}
      </Text>
    </View>
  )
}
