// POS tender screen — take payment(s) against an existing order and settle it.
// Reached from the sell cart's "Tahsil Et" (which first persists the order).
//
// Split modes:
//   • Hepsi        → one payment for the whole remaining balance.
//   • Tutara göre  → enter a partial amount; repeat until the balance clears.
//   • Eşit böl     → split the grand total into N equal shares; each "Öde" takes
//                    one share (capped at the remaining balance).
//   • Ürün seçerek → pick specific cart lines and split them into a NEW child
//                    order (api.pos.orders.split), then pay that child here.
//
// Each payment chooses a method: Nakit (cash account, supports verilen→para üstü),
// Kart (bank account), or Cari (contact). addPayment auto-settles when fully paid.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import {
  type PosOrderDto,
  type PosPaymentMethod,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  CheckBox,
  EmptyState,
  FormSelect,
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
  const registerId = nav.current.params?.registerId ? String(nav.current.params.registerId) : null
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
  const [selectedLineIds, setSelectedLineIds] = React.useState<string[]>([])

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
    const n = Number(amountStr.replace(',', '.'))
    return isNaN(n) ? 0 : round2(n)
  }, [splitMode, remaining, equalShare, amountStr])

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
        orderQ.refetch()
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

  const splitSelected = () => {
    if (!order || selectedLineIds.length === 0) return
    void submit(
      async () => {
        const child = await api.pos.orders.split(order.id, { lineIds: selectedLineIds })
        setSelectedLineIds([])
        nav.navigate('pos.tender', { id: child.id, registerId }, 'Tahsilat')
      },
      { errorTitle: 'Bölme başarısız' },
    )
  }

  const toggleLine = (lineId: string) =>
    setSelectedLineIds((cur) => (cur.includes(lineId) ? cur.filter((id) => id !== lineId) : [...cur, lineId]))

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

  return (
    <Screen
      header={{ title: `Tahsilat · ${order.orderNo}`, onBack: nav.goBack }}
      onRefresh={orderQ.refetch}
      refreshing={orderQ.refreshing}
      footer={
        settled ? (
          <Button title="Bitti" icon="check" fullWidth onPress={nav.goBack} />
        ) : splitMode === 'items' ? (
          <Button
            title={`Seçili ürünleri ayır (${selectedLineIds.length})`}
            icon="scissors"
            fullWidth
            loading={busy}
            disabled={selectedLineIds.length === 0}
            onPress={splitSelected}
          />
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
                Ayrılacak ürünler
              </Text>
              {order.lines.map((line) => {
                const on = selectedLineIds.includes(line.id)
                return (
                  <Pressable
                    key={line.id}
                    onPress={() => toggleLine(line.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], paddingVertical: t.spacing[2] }}
                  >
                    <CheckBox checked={on} />
                    <View style={{ flex: 1 }}>
                      <Text variant="body" weight="medium" numberOfLines={1}>
                        {line.qty}× {line.name}
                      </Text>
                      {line.modifiers.length > 0 ? (
                        <Text variant="caption" tone="muted" numberOfLines={1}>
                          {line.modifiers.map((m) => m.optionNameSnapshot).join(', ')}
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="label" weight="semibold">
                      {formatMoney(line.lineTotal, currency)}
                    </Text>
                  </Pressable>
                )
              })}
              <Text variant="caption" tone="muted">
                Seçilenler yeni bir fişe taşınır; o fişi ayrıca tahsil edersiniz.
              </Text>
            </Card>
          ) : null}

          {/* Payment method (hidden in items mode) */}
          {splitMode !== 'items' ? (
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
          ) : null}
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
    </Screen>
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
